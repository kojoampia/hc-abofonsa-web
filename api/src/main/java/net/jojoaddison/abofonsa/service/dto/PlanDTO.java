package net.jojoaddison.abofonsa.service.dto;

import java.util.List;

/**
 * Flat, locale-resolved view of a {@link net.jojoaddison.abofonsa.domain.Plan} (spec
 * §7.4). {@code priceAmount} is pre-formatted for the requesting locale (§10.5) — never a raw
 * number the client would have to format itself.
 */
public record PlanDTO(
        String id,
        String code,
        String name,
        String forWho,
        String priceAmount,
        String priceCurrency,
        String priceNote,
        boolean featured,
        List<PlanFeatureDTO> features,
        PlanComparisonDTO comparison,
        int displayOrder) {}
