package net.jojoaddison.abofonsa.content.view;

import java.util.List;

/**
 * Flat, locale-resolved view of a {@link net.jojoaddison.abofonsa.content.PlanDocument} (spec
 * §7.4). {@code priceAmount} is pre-formatted for the requesting locale (§10.5) — never a raw
 * number the client would have to format itself.
 */
public record PlanView(
        String id,
        String code,
        String name,
        String forWho,
        String priceAmount,
        String priceCurrency,
        String priceNote,
        boolean featured,
        List<PlanFeatureView> features,
        PlanComparisonView comparison,
        int displayOrder) {}
