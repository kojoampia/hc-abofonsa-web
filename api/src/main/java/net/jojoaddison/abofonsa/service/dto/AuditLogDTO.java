package net.jojoaddison.abofonsa.service.dto;

import java.time.Instant;
import java.util.Map;
import net.jojoaddison.abofonsa.domain.enumeration.AuditAction;

/** Staff-facing audit entry (spec §7.5 {@code GET /audit}, ADMIN only). */
public record AuditLogDTO(
        String id,
        Instant at,
        String actorId,
        String actorName,
        AuditAction action,
        String entityType,
        String entityId,
        Map<String, Object> detail) {}
