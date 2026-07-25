package net.jojoaddison.abofonsa.service;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import javax.imageio.ImageIO;
import net.jojoaddison.abofonsa.config.ApplicationProperties;
import net.jojoaddison.abofonsa.domain.LocalizedText;
import net.jojoaddison.abofonsa.domain.Media;
import net.jojoaddison.abofonsa.domain.enumeration.AuditAction;
import net.jojoaddison.abofonsa.domain.enumeration.ContentType;
import net.jojoaddison.abofonsa.repository.MediaRepository;
import net.jojoaddison.abofonsa.web.rest.errors.ConflictException;
import net.jojoaddison.abofonsa.web.rest.errors.ContentNotFoundException;
import net.jojoaddison.abofonsa.web.rest.errors.SpamRejectedException;
import org.bson.Document;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * The media library (spec §8.2 {@code media}, §7.7 uploads row, plan tasks 52-53). Uploads are
 * validated by magic bytes — never by filename or declared content type — then fully re-encoded
 * through ImageIO, which drops every metadata segment (EXIF, GPS, XMP) by construction.
 *
 * <p><b>Format-support deviation from spec §7.7:</b> the allow-list names JPEG, PNG, WebP and
 * AVIF, but re-encoding WebP/AVIF requires native ImageIO codecs the runtime doesn't ship. Since
 * pass-through storage would violate the strip-EXIF rule, those two are refused with a clear
 * message rather than stored unsanitised. Revisit with a TwelveMonkeys/native-codec dependency
 * if editors need them; browsers get modern formats via the frontend build pipeline regardless.
 */
@Service
public class MediaService {

    private static final long MAX_BYTES = 8 * 1024 * 1024; // spec §7.7: 8 MB cap
    private static final Set<String> REFERENCE_KEYS = Set.of("imageId", "portraitId", "ogImageId");

    private final MediaRepository mediaRepository;
    private final AuditService auditService;
    private final Path storageRoot;

    public MediaService(MediaRepository mediaRepository, AuditService auditService, ApplicationProperties properties) {
        this.mediaRepository = mediaRepository;
        this.auditService = auditService;
        this.storageRoot = Path.of(properties.media().storagePath());
    }

    public Media upload(MultipartFile file, String actorId) {
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        if (bytes.length == 0 || bytes.length > MAX_BYTES) {
            throw new SpamRejectedException("upload empty or over the 8 MB cap");
        }
        var format = sniffFormat(bytes);
        var image = readImage(bytes);

        var now = Instant.now();
        var yearMonth = ZonedDateTime.ofInstant(now, ZoneOffset.UTC);
        var safeName = String.valueOf(file.getOriginalFilename())
                .replaceAll("[^A-Za-z0-9._-]", "-")
                .toLowerCase(java.util.Locale.ROOT);
        var keyPrefix = "media/%d/%02d/%s-%s"
                .formatted(yearMonth.getYear(), yearMonth.getMonthValue(), UUID.randomUUID(), safeName);

        var variants = new ArrayList<Media.Variant>();
        var full = writeVariant(image, format, keyPrefix, "full", 1180);
        variants.add(full);
        variants.add(writeVariant(image, format, keyPrefix, "medium", 760));
        var thumb = writeVariant(image, format, keyPrefix, "thumb", 320);
        variants.add(thumb);

        var blurHash = BlurHash.encode(scaleTo(image, 32), 4, 3);

        var media = new Media(
                null,
                1,
                safeName,
                format.mime,
                full.bytes(),
                image.getWidth(),
                image.getHeight(),
                blurHash,
                full.storageKey(),
                List.copyOf(variants),
                LocalizedText.empty(),
                List.of(),
                now,
                actorId);
        var saved = mediaRepository.save(media);
        auditService.record(
                actorId, actorId, AuditAction.MEDIA_UPLOADED, "MEDIA", saved.id(), Map.of("filename", safeName));
        return saved;
    }

    public void delete(String id, String actorId) {
        var media = mediaRepository.findById(id).orElseThrow(() -> ContentNotFoundException.forId("media", id));
        if (!media.referencedBy().isEmpty()) {
            throw new ConflictException(
                    "Media is referenced by content and cannot be deleted",
                    Map.of("referencedBy", media.referencedBy()));
        }
        for (var variant : media.variants()) {
            try {
                Files.deleteIfExists(storageRoot.resolve(variant.storageKey()));
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        }
        mediaRepository.deleteById(id);
        auditService.record(
                actorId, actorId, AuditAction.MEDIA_DELETED, "MEDIA", id, Map.of("filename", media.filename()));
    }

    public List<Media> orphans() {
        return mediaRepository.findByReferencedByIsEmpty();
    }

    /**
     * Maintains {@code referencedBy} on every content save (R-9): the entity is removed from all
     * assets, then re-attached to every media id found under a known reference key
     * ({@code imageId}/{@code portraitId}/{@code ogImageId}) in the just-saved document.
     */
    public void syncReferences(ContentType entityType, String entityId, Document savedDocument) {
        var referenced = new ArrayList<String>();
        collectReferences(savedDocument, referenced);

        for (var media : mediaRepository.findAll()) {
            var refs = new ArrayList<>(media.referencedBy());
            var had = refs.removeIf(r ->
                    r.entityType().equals(entityType.name()) && r.entityId().equals(entityId));
            var shouldHave = referenced.contains(media.id());
            if (shouldHave) {
                refs.add(new Media.Reference(entityType.name(), entityId));
            }
            if (had || shouldHave) {
                mediaRepository.save(new Media(
                        media.id(),
                        media.schemaVersion(),
                        media.filename(),
                        media.contentType(),
                        media.bytes(),
                        media.width(),
                        media.height(),
                        media.blurHash(),
                        media.storageKey(),
                        media.variants(),
                        media.alt(),
                        List.copyOf(refs),
                        media.createdAt(),
                        media.createdBy()));
            }
        }
    }

    private static void collectReferences(Object node, List<String> out) {
        if (node instanceof Map<?, ?> map) {
            for (var entry : map.entrySet()) {
                if (REFERENCE_KEYS.contains(String.valueOf(entry.getKey())) && entry.getValue() instanceof String s) {
                    out.add(s);
                } else {
                    collectReferences(entry.getValue(), out);
                }
            }
        } else if (node instanceof List<?> list) {
            list.forEach(item -> collectReferences(item, out));
        }
    }

    private enum Format {
        JPEG("image/jpeg", "jpg"),
        PNG("image/png", "png");

        final String mime;
        final String extension;

        Format(String mime, String extension) {
            this.mime = mime;
            this.extension = extension;
        }
    }

    /** Magic-byte detection (spec §7.7) — the declared content type and extension are ignored. */
    private static Format sniffFormat(byte[] bytes) {
        if (bytes.length > 3 && (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF) {
            return Format.JPEG;
        }
        if (bytes.length > 8 && (bytes[0] & 0xFF) == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G') {
            return Format.PNG;
        }
        var isWebp = bytes.length > 12
                && bytes[0] == 'R'
                && bytes[1] == 'I'
                && bytes[2] == 'F'
                && bytes[3] == 'F'
                && bytes[8] == 'W'
                && bytes[9] == 'E'
                && bytes[10] == 'B'
                && bytes[11] == 'P';
        var isAvif = bytes.length > 12
                && bytes[4] == 'f'
                && bytes[5] == 't'
                && bytes[6] == 'y'
                && bytes[7] == 'p'
                && bytes[8] == 'a'
                && bytes[9] == 'v'
                && bytes[10] == 'i'
                && bytes[11] == 'f';
        if (isWebp || isAvif) {
            throw new SpamRejectedException(
                    "WebP/AVIF uploads are not accepted: no codec available to re-encode them, and storing"
                            + " without re-encoding would skip the mandatory metadata strip (spec §7.7)");
        }
        throw new SpamRejectedException("upload is not a recognised JPEG or PNG image");
    }

    private static BufferedImage readImage(byte[] bytes) {
        try {
            var image = ImageIO.read(new java.io.ByteArrayInputStream(bytes));
            if (image == null) {
                throw new SpamRejectedException("upload could not be decoded as an image");
            }
            return image;
        } catch (IOException e) {
            throw new SpamRejectedException("upload could not be decoded as an image");
        }
    }

    /** Re-encode (drops all metadata) at the given max width; never upscales. */
    private Media.Variant writeVariant(
            BufferedImage source, Format format, String keyPrefix, String label, int maxWidth) {
        var scaled = source.getWidth() <= maxWidth ? source : scaleTo(source, maxWidth);
        var buffer = new ByteArrayOutputStream();
        try {
            // PNG keeps alpha; everything else goes through RGB JPEG.
            var target = format == Format.PNG ? scaled : stripAlpha(scaled);
            ImageIO.write(target, format.extension.equals("jpg") ? "jpeg" : format.extension, buffer);
            var key = "%s-%s.%s".formatted(keyPrefix, label, format.extension);
            var path = storageRoot.resolve(key);
            Files.createDirectories(path.getParent());
            Files.write(path, buffer.toByteArray());
            return new Media.Variant(label, scaled.getWidth(), key, buffer.size());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static BufferedImage scaleTo(BufferedImage source, int targetWidth) {
        var targetHeight = Math.max(1, (int) ((long) source.getHeight() * targetWidth / source.getWidth()));
        var scaled = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
        var graphics = scaled.createGraphics();
        graphics.setRenderingHint(
                java.awt.RenderingHints.KEY_INTERPOLATION, java.awt.RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        graphics.drawImage(source, 0, 0, targetWidth, targetHeight, null);
        graphics.dispose();
        return scaled;
    }

    private static BufferedImage stripAlpha(BufferedImage source) {
        if (source.getType() == BufferedImage.TYPE_INT_RGB) {
            return source;
        }
        var rgb = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_RGB);
        var graphics = rgb.createGraphics();
        graphics.drawImage(source, 0, 0, java.awt.Color.WHITE, null);
        graphics.dispose();
        return rgb;
    }
}
