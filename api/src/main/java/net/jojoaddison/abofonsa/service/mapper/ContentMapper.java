package net.jojoaddison.abofonsa.service.mapper;

import net.jojoaddison.abofonsa.domain.CareService;
import net.jojoaddison.abofonsa.domain.CareerTrack;
import net.jojoaddison.abofonsa.domain.Faq;
import net.jojoaddison.abofonsa.domain.LocalizedText;
import net.jojoaddison.abofonsa.domain.Plan;
import net.jojoaddison.abofonsa.domain.Section;
import net.jojoaddison.abofonsa.domain.SiteSettings;
import net.jojoaddison.abofonsa.domain.Testimonial;
import net.jojoaddison.abofonsa.domain.enumeration.Locale;
import net.jojoaddison.abofonsa.repository.MediaRepository;
import net.jojoaddison.abofonsa.service.PriceFormatter;
import net.jojoaddison.abofonsa.service.dto.AddressDTO;
import net.jojoaddison.abofonsa.service.dto.CareServiceDTO;
import net.jojoaddison.abofonsa.service.dto.CareerTrackDTO;
import net.jojoaddison.abofonsa.service.dto.FaqDTO;
import net.jojoaddison.abofonsa.service.dto.MediaDTO;
import net.jojoaddison.abofonsa.service.dto.PlanComparisonDTO;
import net.jojoaddison.abofonsa.service.dto.PlanDTO;
import net.jojoaddison.abofonsa.service.dto.PlanFeatureDTO;
import net.jojoaddison.abofonsa.service.dto.SectionDTO;
import net.jojoaddison.abofonsa.service.dto.SectionItemDTO;
import net.jojoaddison.abofonsa.service.dto.SiteSettingsDTO;
import net.jojoaddison.abofonsa.service.dto.TestimonialDTO;
import org.springframework.stereotype.Component;

/**
 * Explicit, hand-written mapping from Mongo documents to flat, locale-resolved API view records
 * (spec §7.1) — no reflection-based mapping framework, so a field rename fails at compile time
 * rather than silently dropping data at runtime.
 *
 * <p>{@code image}/{@code portrait} fields resolve their stored media id against the media library
 * (see {@link #toMedia}), carrying the rendition widths the public site needs for {@code srcset}.
 * These were hard-coded to {@code null} through Phases 6-18: the library could accept uploads and
 * the templates could render images, but nothing joined the two, so no photograph could ever reach
 * a visitor.
 */
@Component
public class ContentMapper {

    private final PriceFormatter priceFormatter;
    private final MediaRepository mediaRepository;

    /** CMS-created documents may omit any optional localised field entirely - a null field
     * renders as empty text, never an NPE taking down the whole public payload. */
    private static String resolve(LocalizedText text, Locale locale) {
        return text == null ? "" : text.resolve(locale);
    }

    public ContentMapper(PriceFormatter priceFormatter, MediaRepository mediaRepository) {
        this.priceFormatter = priceFormatter;
        this.mediaRepository = mediaRepository;
    }

    /**
     * Resolves a stored media id into the flat reference the public payload carries.
     *
     * <p>A dangling id yields {@code null} rather than an error: media can be deleted while a
     * document still names it, and a missing photograph must never take down the page it was
     * decorating. The templates already render a placeholder for a null image.
     *
     * <p>Alt text is localised — the whole point of storing it per locale in the media library —
     * and falls back through {@link LocalizedText#resolve} like every other translated field.
     */
    private MediaDTO toMedia(String mediaId, Locale locale) {
        if (mediaId == null || mediaId.isBlank()) {
            return null;
        }
        return mediaRepository
                .findById(mediaId)
                .map(media -> new MediaDTO(
                        media.id(),
                        "/" + media.storageKey(),
                        resolve(media.alt(), locale),
                        media.width(),
                        media.height(),
                        media.blurHash(),
                        media.variants().stream()
                                .map(variant -> new MediaDTO.VariantDTO(
                                        variant.label(),
                                        variant.width(),
                                        "/" + variant.storageKey(),
                                        contentTypeOf(variant.storageKey())))
                                .toList()))
                .orElse(null);
    }

    /** The stored key's extension is the authority on a rendition's format — the variants are
     * re-encoded on upload, so the original upload's content type may not describe them. */
    private static String contentTypeOf(String storageKey) {
        var lower = storageKey.toLowerCase(java.util.Locale.ROOT);
        if (lower.endsWith(".png")) {
            return "image/png";
        }
        if (lower.endsWith(".avif")) {
            return "image/avif";
        }
        if (lower.endsWith(".webp")) {
            return "image/webp";
        }
        return "image/jpeg";
    }

    public CareServiceDTO toView(CareService doc, Locale locale) {
        return new CareServiceDTO(
                doc.id(),
                doc.slug(),
                resolve(doc.name(), locale),
                resolve(doc.blurb(), locale),
                doc.points() == null
                        ? java.util.List.of()
                        : doc.points().stream().map(p -> resolve(p, locale)).toList(),
                resolve(doc.availableOn(), locale),
                toMedia(doc.imageId(), locale),
                doc.displayOrder());
    }

    public CareerTrackDTO toView(CareerTrack doc, Locale locale) {
        return new CareerTrackDTO(
                doc.id(),
                doc.slug(),
                resolve(doc.title(), locale),
                resolve(doc.blurb(), locale),
                resolveAll(doc.requirements(), locale),
                resolveAll(doc.documents(), locale),
                doc.authorityRole() == null ? null : doc.authorityRole().name(),
                doc.openings(),
                doc.displayOrder());
    }

    /** A CMS-created document may omit a localized list entirely; an absent list is an empty one,
     * never an NPE taking down the whole public payload. */
    private static java.util.List<String> resolveAll(java.util.List<LocalizedText> texts, Locale locale) {
        return texts == null
                ? java.util.List.of()
                : texts.stream().map(t -> resolve(t, locale)).toList();
    }

    public PlanDTO toView(Plan doc, Locale locale) {
        var features = (doc.features() == null ? java.util.List.<Plan.PlanFeature>of() : doc.features())
                .stream()
                        .map(f -> new PlanFeatureDTO(resolve(f.label(), locale), f.included(), f.emphasised()))
                        .toList();
        var comparison = new PlanComparisonDTO(
                doc.comparison().visitsPerWeek().resolve(locale),
                doc.comparison().medicalSupport().resolve(locale),
                doc.comparison().auxiliary().resolve(locale),
                doc.comparison().telemetry().resolve(locale),
                doc.comparison().reporting().resolve(locale),
                doc.comparison().careManager().resolve(locale));
        return new PlanDTO(
                doc.id(),
                doc.code(),
                resolve(doc.name(), locale),
                resolve(doc.forWho(), locale),
                priceFormatter.format(doc.price().amount(), locale),
                doc.price().currency(),
                resolve(doc.priceNote(), locale),
                doc.featured(),
                features,
                comparison,
                doc.displayOrder());
    }

    public TestimonialDTO toView(Testimonial doc, Locale locale) {
        return new TestimonialDTO(
                doc.id(),
                resolve(doc.quote(), locale),
                doc.personName(),
                resolve(doc.personRole(), locale),
                resolve(doc.planLabel(), locale),
                doc.rating(),
                toMedia(doc.portraitId(), locale),
                doc.displayOrder());
    }

    public FaqDTO toView(Faq doc, Locale locale) {
        return new FaqDTO(doc.id(), resolve(doc.question(), locale), resolve(doc.answer(), locale), doc.displayOrder());
    }

    public SectionDTO toView(Section doc, Locale locale) {
        var items = doc.items() == null
                ? java.util.List.<SectionItemDTO>of()
                : doc.items().stream()
                        .map(i -> new SectionItemDTO(
                                i.key(), i.icon(), resolve(i.title(), locale), resolve(i.body(), locale)))
                        .toList();
        return new SectionDTO(
                resolve(doc.eyebrow(), locale),
                resolve(doc.heading(), locale),
                resolve(doc.subheading(), locale),
                resolve(doc.body(), locale),
                items,
                toMedia(doc.imageId(), locale));
    }

    public SiteSettingsDTO toView(SiteSettings doc, Locale locale) {
        var address = new AddressDTO(
                doc.address().street(),
                doc.address().district(),
                doc.address().city(),
                doc.address().country());
        return new SiteSettingsDTO(
                doc.organisationName(),
                resolve(doc.tagline(), locale),
                doc.phones(),
                doc.whatsapp(),
                doc.email(),
                address,
                resolve(doc.coordinationHours(), locale),
                resolve(doc.onCallHours(), locale),
                doc.professionalPortalUrl(),
                doc.professionalInvitationUrl());
    }
}
