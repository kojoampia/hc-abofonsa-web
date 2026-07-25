package net.jojoaddison.abofonsa.service.dto;

import java.time.Instant;
import java.util.Map;

/** One entry in an entity's revision history (spec §7.5 {@code GET .../revisions}). */
public record ContentRevisionDTO(
        int revisionNumber,
        String status,
        String changeSummary,
        Instant createdAt,
        String createdBy,
        Map<String, Object> snapshot) {}
