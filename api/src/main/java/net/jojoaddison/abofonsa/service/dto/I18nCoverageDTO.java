package net.jojoaddison.abofonsa.service.dto;

import java.util.List;

/** Per-locale translation coverage (spec §9.4 T-7): UI-string key gaps against the shipped
 * {@code en.json} key set, override counts, and average content completeness for the dashboard
 * bars (§9.6). */
public record I18nCoverageDTO(
        String locale, int totalUiKeys, List<String> missingUiKeys, int overriddenUiKeys, double contentCompleteness) {}
