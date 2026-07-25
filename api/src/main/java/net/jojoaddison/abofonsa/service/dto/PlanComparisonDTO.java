package net.jojoaddison.abofonsa.service.dto;

/** One plan's column in the pricing comparison table (spec §6 component 13). */
public record PlanComparisonDTO(
        String visitsPerWeek,
        String medicalSupport,
        String auxiliary,
        String telemetry,
        String reporting,
        String careManager) {}
