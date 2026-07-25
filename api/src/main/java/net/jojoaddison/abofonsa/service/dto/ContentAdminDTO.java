package net.jojoaddison.abofonsa.service.dto;

import java.util.Map;
import net.jojoaddison.abofonsa.domain.enumeration.ContentType;

/**
 * One content entity as the CMS sees it: the raw document (all locales — resolution happens only
 * on the public API, spec §7.4) plus per-locale completeness for the editor's tab glyphs (E-1).
 */
public record ContentAdminDTO(
        String id,
        ContentType type,
        String status,
        Long version,
        Map<String, Double> completeness,
        Map<String, Object> document) {}
