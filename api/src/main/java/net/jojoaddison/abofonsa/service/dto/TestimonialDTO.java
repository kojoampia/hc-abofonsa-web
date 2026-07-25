package net.jojoaddison.abofonsa.service.dto;

public record TestimonialDTO(
        String id,
        String quote,
        String personName,
        String personRole,
        String planLabel,
        int rating,
        MediaDTO portrait,
        int displayOrder) {}
