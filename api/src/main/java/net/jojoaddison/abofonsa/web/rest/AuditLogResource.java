package net.jojoaddison.abofonsa.web.rest;

import java.util.List;
import net.jojoaddison.abofonsa.repository.AuditLogRepository;
import net.jojoaddison.abofonsa.service.dto.AuditLogDTO;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** The audit trail (spec §7.5) — ADMIN only. {@code ipHash} stays server-side; even admins see
 * actions, not address material. */
@RestController
public class AuditLogResource {

    private final AuditLogRepository auditLogRepository;

    public AuditLogResource(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping("/api/v1/admin/audit")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AuditLogDTO>> list(
            @RequestParam(required = false) String actorId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        var pageable = PageRequest.of(page, size);
        var result = actorId == null
                ? auditLogRepository.findAllByOrderByAtDesc(pageable)
                : auditLogRepository.findByActorIdOrderByAtDesc(actorId, pageable);
        var body = result.getContent().stream()
                .map(a -> new AuditLogDTO(
                        a.id(),
                        a.at(),
                        a.actorId(),
                        a.actorName(),
                        a.action(),
                        a.entityType(),
                        a.entityId(),
                        a.detail()))
                .toList();
        return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(result.getTotalElements()))
                .body(body);
    }
}
