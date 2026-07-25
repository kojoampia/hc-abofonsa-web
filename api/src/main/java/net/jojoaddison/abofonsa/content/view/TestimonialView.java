package net.jojoaddison.abofonsa.content.view;

public record TestimonialView(
        String id,
        String quote,
        String personName,
        String personRole,
        String planLabel,
        int rating,
        MediaView portrait,
        int displayOrder) {}
