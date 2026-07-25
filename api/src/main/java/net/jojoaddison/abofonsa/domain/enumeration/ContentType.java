package net.jojoaddison.abofonsa.domain.enumeration;

/** The ContentType enumeration — the entity kinds carrying a revision history (spec §8.2
 * {@code contentRevisions.entityType}, and the {@code {type}} segment of the admin API §7.5). */
public enum ContentType {
    SERVICE,
    PLAN,
    TESTIMONIAL,
    FAQ,
    SECTION,
    SETTINGS
}
