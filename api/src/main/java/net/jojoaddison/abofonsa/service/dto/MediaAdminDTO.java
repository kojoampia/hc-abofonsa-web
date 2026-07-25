package net.jojoaddison.abofonsa.service.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/** Staff-facing media library entry (spec §7.5). {@code alt} carries all locales — it is edited
 * per locale in the CMS (spec §8.2: alt text is read aloud, so it is localised). */
public record MediaAdminDTO(
        String id,
        String filename,
        String contentType,
        long bytes,
        int width,
        int height,
        String blurHash,
        String url,
        List<VariantDTO> variants,
        Map<String, String> alt,
        List<ReferenceDTO> referencedBy,
        Instant createdAt) {

    public record VariantDTO(String label, int width, String url, long bytes) {}

    public record ReferenceDTO(String entityType, String entityId) {}
}
