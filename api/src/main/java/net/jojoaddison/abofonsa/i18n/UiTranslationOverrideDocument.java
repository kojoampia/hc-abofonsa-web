package net.jojoaddison.abofonsa.i18n;

import java.time.Instant;
import java.util.Map;
import net.jojoaddison.abofonsa.common.Locale;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * CMS-editable UI-string overrides layered on top of the shipped {@code web/public/i18n/*.json}
 * bundles (spec §9.4/§10.3). Full override editing is Phase 7; this document shape lets the
 * public {@code GET /api/v1/i18n/{locale}.json} endpoint exist now, returning {@code {}} until
 * Phase 7 adds writes.
 */
@Document(collection = "uiTranslationOverrides")
public record UiTranslationOverrideDocument(
        @Id String id,
        int schemaVersion,
        Locale locale,
        Map<String, String> entries,
        Instant updatedAt,
        String updatedBy) {}
