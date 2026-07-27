package net.jojoaddison.abofonsa.service.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * The careers page's payload — {@code GET /api/v1/content/careers}.
 *
 * <p>Separate from {@link SiteContentDTO} rather than folded into it, which careers-plan.md §4
 * originally sketched. Two reasons, found while building it:
 *
 * <ul>
 *   <li>{@code FaqDTO} carries no category and the home page renders {@code faqs} unfiltered, so
 *       careers questions in that list would appear in the family FAQ accordion. That is a bug, not
 *       a styling detail.
 *   <li>Every visitor to the home page would download careers content they never see. The careers
 *       route is lazy precisely so it costs nothing until asked for; putting its content in the
 *       shared payload would undo that.
 * </ul>
 *
 * <p>{@code siteSettings} is deliberately absent: the careers page renders inside the same shell as
 * everything else, which already has it from the site payload. Repeating it here would give the
 * page two sources for the same phone number.
 */
public record CareersContentDTO(
        String locale,
        Instant generatedAt,
        Map<String, SectionDTO> sections,
        List<CareerTrackDTO> tracks,
        List<FaqDTO> faqs) {}
