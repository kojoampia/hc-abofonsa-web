package net.jojoaddison.abofonsa.repository;

import java.util.List;
import net.jojoaddison.abofonsa.domain.AuditLog;
import net.jojoaddison.abofonsa.domain.enumeration.AuditAction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AuditLogRepository extends MongoRepository<AuditLog, String> {

    Page<AuditLog> findAllByOrderByAtDesc(Pageable pageable);

    List<AuditLog> findByEntityTypeAndEntityIdOrderByAtDesc(String entityType, String entityId);

    List<AuditLog> findByActionOrderByAtDesc(AuditAction action);

    /** Backs the per-IP login lockout window (spec §7.7). */
    long countByActionAndIpHashAndAtAfter(AuditAction action, String ipHash, java.time.Instant after);

    Page<AuditLog> findByActorIdOrderByAtDesc(String actorId, Pageable pageable);
}
