package net.jojoaddison.abofonsa.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import net.jojoaddison.abofonsa.AbstractIntegrationTest;
import net.jojoaddison.abofonsa.domain.enumeration.AuditAction;
import net.jojoaddison.abofonsa.domain.enumeration.EnquiryStatus;
import net.jojoaddison.abofonsa.repository.AuditLogRepository;
import net.jojoaddison.abofonsa.repository.EnquiryRepository;
import net.jojoaddison.abofonsa.service.dto.EnquiryRequestDTO;
import net.jojoaddison.abofonsa.service.dto.EnquiryUpdateDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;

/**
 * Service-level coverage of the staff workflow (plan.md tasks 33-34). These run without HTTP
 * auth on purpose: the {@code /api/v1/admin/**} filter chain already rejects all unauthenticated
 * requests and Phase 5 re-verifies these operations through real JWT roles (task 39).
 */
class EnquiryServiceTest extends AbstractIntegrationTest {

    @Autowired
    private EnquiryService enquiryService;

    @Autowired
    private EnquiryRepository enquiryRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @BeforeEach
    void clean() {
        enquiryRepository.deleteAll();
        auditLogRepository.deleteAll();
    }

    private String submitOne() {
        var request = new EnquiryRequestDTO(
                "Ama Serwaa",
                "+233 20 111 2222",
                "ama@example.com",
                "PEAR",
                "A parent or grandparent",
                "Looking for weekday support",
                "en",
                "/#contact",
                true,
                null,
                9000L);
        return enquiryService.submit(request, "203.0.113.7", "test-agent").reference();
    }

    @Test
    void ipHashIsSaltedAndNeverTheLiteralAddress() {
        var reference = submitOne();
        var saved = enquiryRepository.findByReference(reference).orElseThrow();
        assertThat(saved.meta().ipHash())
                .startsWith("sha256:")
                .hasSizeGreaterThan(40)
                .doesNotContain("203.0.113.7");
        // Same IP, same salt -> same hash (what makes the rate limit work).
        assertThat(enquiryService.hashIp("203.0.113.7")).isEqualTo(saved.meta().ipHash());
    }

    @Test
    void listFiltersAndPaginates() {
        submitOne();
        submitOne();
        var all = enquiryService.list(null, PageRequest.of(0, 10));
        assertThat(all.getTotalElements()).isEqualTo(2);
        var closed = enquiryService.list(EnquiryStatus.CLOSED, PageRequest.of(0, 10));
        assertThat(closed.getTotalElements()).isZero();
    }

    @Test
    void updateTransitionsStatusAppendsNoteAndWritesAudit() {
        var reference = submitOne();
        var id = enquiryRepository.findByReference(reference).orElseThrow().id();

        var updated = enquiryService.update(
                id, new EnquiryUpdateDTO(EnquiryStatus.CONTACTED, "Called, left voicemail", "usr_admin"), "usr_admin");

        assertThat(updated.status()).isEqualTo(EnquiryStatus.CONTACTED);
        assertThat(updated.notes()).hasSize(1);
        assertThat(updated.notes().get(0).text()).isEqualTo("Called, left voicemail");
        assertThat(auditLogRepository.findByActionOrderByAtDesc(AuditAction.ENQUIRY_UPDATED))
                .hasSize(1);
    }

    @Test
    void hardDeleteRemovesTheDocumentAndRecordsTheErasureInAudit() {
        var reference = submitOne();
        var id = enquiryRepository.findByReference(reference).orElseThrow().id();

        enquiryService.delete(id, "usr_admin");

        assertThat(enquiryRepository.findById(id)).isEmpty();
        List<net.jojoaddison.abofonsa.domain.AuditLog> deletions =
                auditLogRepository.findByActionOrderByAtDesc(AuditAction.ENQUIRY_DELETED);
        assertThat(deletions).hasSize(1);
        assertThat(deletions.get(0).detail()).containsEntry("reference", reference);
    }
}
