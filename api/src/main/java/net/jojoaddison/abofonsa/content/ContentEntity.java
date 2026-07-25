package net.jojoaddison.abofonsa.content;

import java.time.Instant;
import net.jojoaddison.abofonsa.common.PublicationStatus;

/**
 * Marker for the five content types with a publish/revision lifecycle (spec §7.3). Any
 * {@code switch} over this hierarchy is checked for exhaustiveness at compile time — adding a
 * sixth content type breaks the build until every switch handles it.
 *
 * <p>Named {@code *Document} rather than the spec's illustrative {@code *Entity} naming, to match
 * the {@code *Document}/{@code *Repository}/{@code *Service}/{@code *Controller} convention the
 * repository layout itself specifies (spec §4). {@code siteSettings} is a singleton with no
 * revision history and is deliberately not part of this hierarchy.
 *
 * <p>Lives in {@code content}, not {@code common} as spec §7.3 illustrates — without Java Platform
 * Module System modules (not used in this project), a sealed type's permitted subtypes must share
 * its package.
 */
public sealed interface ContentEntity
        permits ServiceDocument, PlanDocument, TestimonialDocument, FaqDocument, SectionDocument {

    String id();

    PublicationStatus status();

    Instant updatedAt();
}
