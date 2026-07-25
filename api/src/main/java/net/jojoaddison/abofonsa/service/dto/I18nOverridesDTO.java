package net.jojoaddison.abofonsa.service.dto;

import java.util.Map;

/** A locale's UI strings as the translation workspace sees them (spec §9.4): the shipped
 * defaults and the CMS overrides side by side, so [DEF] markers (T-4) need no second call. */
public record I18nOverridesDTO(String locale, Map<String, String> defaults, Map<String, String> overrides) {}
