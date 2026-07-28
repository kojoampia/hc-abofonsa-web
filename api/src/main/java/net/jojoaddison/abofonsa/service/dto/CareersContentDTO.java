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
 *
 * <p>{@code contentLanguage} is <em>not</em> the same thing as {@code locale}. {@code locale} is what
 * was asked for; {@code contentLanguage} is what the text actually came back in. They differ whenever
 * {@link net.jojoaddison.abofonsa.domain.LocalizedText#resolve} falls back to English, which today is
 * every non-English request — careers copy is seeded English-only on purpose (careers-plan.md D-5).
 * The page needs to know, because serving English prose inside {@code <html lang="es">} is a WCAG 2.2
 * AA failure under 3.1.2 Language of Parts: a screen reader applies Spanish pronunciation rules to
 * English words and the result is not intelligible. No automated checker detects it — axe-core does
 * not read the text — so the server has to say so and the page has to mark it.
 */
public record CareersContentDTO(
        String locale,
        String contentLanguage,
        Instant generatedAt,
        Map<String, SectionDTO> sections,
        List<CareerTrackDTO> tracks,
        List<FaqDTO> faqs) {}
