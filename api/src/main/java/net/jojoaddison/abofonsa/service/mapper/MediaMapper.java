package net.jojoaddison.abofonsa.service.mapper;

import java.util.LinkedHashMap;
import java.util.Map;
import net.jojoaddison.abofonsa.domain.Media;
import net.jojoaddison.abofonsa.service.dto.MediaAdminDTO;
import org.springframework.stereotype.Component;

/** Hand-written per the no-reflection-mapping rule (spec §7.1). URLs are served under
 * {@code /media/**} — a static resource handler in dev, nginx in production (spec §8.2). */
@Component
public class MediaMapper {

    public MediaAdminDTO toDto(Media media) {
        Map<String, String> alt = new LinkedHashMap<>();
        media.alt().values().forEach((locale, value) -> alt.put(locale.code(), value));
        return new MediaAdminDTO(
                media.id(),
                media.filename(),
                media.contentType(),
                media.bytes(),
                media.width(),
                media.height(),
                media.blurHash(),
                "/media/" + media.storageKey(),
                media.variants().stream()
                        .map(v -> new MediaAdminDTO.VariantDTO(
                                v.label(), v.width(), "/media/" + v.storageKey(), v.bytes()))
                        .toList(),
                alt,
                media.referencedBy().stream()
                        .map(r -> new MediaAdminDTO.ReferenceDTO(r.entityType(), r.entityId()))
                        .toList(),
                media.createdAt());
    }
}
