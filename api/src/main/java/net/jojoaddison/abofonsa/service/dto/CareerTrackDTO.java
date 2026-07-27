package net.jojoaddison.abofonsa.service.dto;

import java.util.List;

/**
 * A recruited role, locale-resolved for the careers page (careers-plan.md §4).
 *
 * <p>{@code authorityRole} is the field that makes the handoff work: it is carried in the
 * {@code track} parameter of the link to professional.abofonsa.com, so the candidate does not have
 * to choose their role twice.
 *
 * <p>{@code openings} is deliberately part of the public payload rather than a filter applied
 * before it. A track with no current vacancy still renders — saying "we are building this team"
 * keeps a bookmarked link working and is honest about where the service is, whereas silently
 * dropping it looks like a broken page.
 */
public record CareerTrackDTO(
        String id,
        String slug,
        String title,
        String blurb,
        List<String> requirements,
        List<String> documents,
        String authorityRole,
        boolean openings,
        int displayOrder) {}
