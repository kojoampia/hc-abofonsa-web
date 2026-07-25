package net.jojoaddison.abofonsa.domain;

import java.time.Instant;
import java.util.Map;
import net.jojoaddison.abofonsa.domain.enumeration.AuditAction;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** One audit trail entry (spec §8.2 {@code auditLog}). Append-only; never updated or deleted
 * except by the annual archive job (spec Appendix C). */
@Document(collection = "auditLog")
public record AuditLog(
        @Id String id,
        int schemaVersion,
        Instant at,
        String actorId,
        String actorName,
        AuditAction action,
        String entityType,
        String entityId,
        String locale,
        Map<String, Object> detail,
        String ipHash,
        String requestId) {}
