package net.jojoaddison.abofonsa.service;

import java.time.Instant;
import java.util.Map;
import net.jojoaddison.abofonsa.domain.AuditLog;
import net.jojoaddison.abofonsa.domain.enumeration.AuditAction;
import net.jojoaddison.abofonsa.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

/** Appends {@code auditLog} entries (spec §8.2). Callers pass whatever context they have; every
 * entry gets a timestamp here so clocks are consistent. */
@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public AuditLog record(
            String actorId,
            String actorName,
            AuditAction action,
            String entityType,
            String entityId,
            Map<String, Object> detail) {
        var entry = new AuditLog(
                null, 1, Instant.now(), actorId, actorName, action, entityType, entityId, null, detail, null, null);
        return auditLogRepository.save(entry);
    }
}
