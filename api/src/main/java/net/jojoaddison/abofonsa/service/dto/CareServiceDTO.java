package net.jojoaddison.abofonsa.service.dto;

import java.util.List;

/** Flat, locale-resolved view of a {@link net.jojoaddison.abofonsa.domain.CareService} — no
 * {@link net.jojoaddison.abofonsa.domain.LocalizedText} crosses the API boundary (spec §7.4). */
public record CareServiceDTO(
        String id,
        String slug,
        String name,
        String blurb,
        List<String> points,
        String availableOn,
        MediaDTO image,
        int displayOrder) {}
