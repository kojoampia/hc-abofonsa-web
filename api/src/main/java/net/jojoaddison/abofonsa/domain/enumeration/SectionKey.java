package net.jojoaddison.abofonsa.domain.enumeration;

/**
 * The fixed-layout page sections (spec §8.2 {@code sections}).
 *
 * <p>Declaration order is the render order of the home page, and the {@code CAREERS_*} keys are
 * appended after it because they belong to a different page entirely (careers-plan.md §5) — the
 * careers route selects its own by key rather than taking the whole list.
 */
public enum SectionKey {
    HERO,
    ASSURANCE,
    PROCESS,
    APPROACH,
    STATS,
    ANGEL,
    CTA,
    CAREERS_HERO,
    CAREERS_LIFE,
    CAREERS_PROCESS,
    CAREERS_CTA
}
