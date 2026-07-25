package net.jojoaddison.abofonsa.content.view;

/** One plan's column in the pricing comparison table (spec §6 component 13). */
public record PlanComparisonView(
        String visitsPerWeek,
        String medicalSupport,
        String auxiliary,
        String telemetry,
        String reporting,
        String careManager) {}
