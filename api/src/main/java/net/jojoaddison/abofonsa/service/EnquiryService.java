package net.jojoaddison.abofonsa.service;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import net.jojoaddison.abofonsa.config.ApplicationProperties;
import net.jojoaddison.abofonsa.domain.Counter;
import net.jojoaddison.abofonsa.domain.Enquiry;
import net.jojoaddison.abofonsa.domain.enumeration.AuditAction;
import net.jojoaddison.abofonsa.domain.enumeration.EnquiryStatus;
import net.jojoaddison.abofonsa.repository.EnquiryRepository;
import net.jojoaddison.abofonsa.security.IpHasher;
import net.jojoaddison.abofonsa.service.dto.EnquiryDTO;
import net.jojoaddison.abofonsa.service.dto.EnquiryReceiptDTO;
import net.jojoaddison.abofonsa.service.dto.EnquiryRequestDTO;
import net.jojoaddison.abofonsa.service.dto.EnquiryUpdateDTO;
import net.jojoaddison.abofonsa.service.mapper.EnquiryMapper;
import net.jojoaddison.abofonsa.web.rest.errors.ContentNotFoundException;
import net.jojoaddison.abofonsa.web.rest.errors.SpamRejectedException;
import net.jojoaddison.abofonsa.web.rest.errors.TooManyRequestsException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

/**
 * Enquiry intake and handling workflow (spec §7.4, §7.7, §13.3).
 *
 * <p><b>Logging discipline:</b> nothing from the submission body is ever logged — the free-text
 * {@code message} may contain volunteered health information and is treated as special-category
 * data (spec §13.3). Log lines carry the generated reference and nothing the sender wrote.
 */
@Service
public class EnquiryService {

    private static final Logger log = LoggerFactory.getLogger(EnquiryService.class);

    private final EnquiryRepository enquiryRepository;
    private final EnquiryMapper enquiryMapper;
    private final AuditService auditService;
    private final MongoTemplate mongoTemplate;
    private final ApplicationProperties properties;
    private final IpHasher ipHasher;

    public EnquiryService(
            EnquiryRepository enquiryRepository,
            EnquiryMapper enquiryMapper,
            AuditService auditService,
            MongoTemplate mongoTemplate,
            ApplicationProperties properties,
            IpHasher ipHasher) {
        this.enquiryRepository = enquiryRepository;
        this.enquiryMapper = enquiryMapper;
        this.auditService = auditService;
        this.mongoTemplate = mongoTemplate;
        this.properties = properties;
        this.ipHasher = ipHasher;
    }

    public EnquiryReceiptDTO submit(EnquiryRequestDTO request, String clientIp, String userAgent) {
        rejectSpam(request);

        var ipHash = ipHasher.hash(clientIp);
        enforceRateLimit(ipHash);

        var now = Instant.now();
        var reference = nextReference(now);
        // Months have no fixed length, so the 24-month retention (spec §13.3) resolves via
        // calendar arithmetic in UTC rather than a fixed Duration.
        var retention = ZonedDateTime.ofInstant(now, ZoneOffset.UTC)
                .plusMonths(properties.enquiry().retentionMonths())
                .toInstant();

        var enquiry = new Enquiry(
                null,
                1,
                reference,
                request.name(),
                request.phone(),
                request.email(),
                request.planOfInterest(),
                request.relationship(),
                request.message(),
                request.locale(),
                request.sourcePage(),
                EnquiryStatus.NEW,
                null,
                List.of(),
                new Enquiry.Meta(ipHash, userAgent, now),
                retention,
                now);
        enquiryRepository.save(enquiry);

        log.info("Enquiry {} received", reference);
        return new EnquiryReceiptDTO(reference, now);
    }

    public Page<EnquiryDTO> list(EnquiryStatus status, Pageable pageable) {
        var page = status == null
                ? enquiryRepository.findAllByOrderByCreatedAtDesc(pageable)
                : enquiryRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        return page.map(enquiryMapper::toDto);
    }

    public EnquiryDTO update(String id, EnquiryUpdateDTO update, String actorId) {
        var existing = enquiryRepository.findById(id).orElseThrow(() -> ContentNotFoundException.forId("enquiry", id));

        var notes = new ArrayList<>(existing.notes() == null ? List.<Enquiry.Note>of() : existing.notes());
        if (update.note() != null && !update.note().isBlank()) {
            notes.add(new Enquiry.Note(Instant.now(), actorId, update.note()));
        }
        var updated = new Enquiry(
                existing.id(),
                existing.schemaVersion(),
                existing.reference(),
                existing.name(),
                existing.phone(),
                existing.email(),
                existing.planOfInterest(),
                existing.relationship(),
                existing.message(),
                existing.locale(),
                existing.sourcePage(),
                update.status() == null ? existing.status() : update.status(),
                update.assignedTo() == null ? existing.assignedTo() : update.assignedTo(),
                List.copyOf(notes),
                existing.meta(),
                existing.retentionExpiresAt(),
                existing.createdAt());
        enquiryRepository.save(updated);

        auditService.record(
                actorId,
                actorId,
                AuditAction.ENQUIRY_UPDATED,
                "ENQUIRY",
                existing.id(),
                Map.of("reference", existing.reference(), "status", String.valueOf(updated.status())));
        return enquiryMapper.toDto(updated);
    }

    /** Hard delete — the §13.3 erasure right. The deletion itself is recorded in the audit log. */
    public void delete(String id, String actorId) {
        var existing = enquiryRepository.findById(id).orElseThrow(() -> ContentNotFoundException.forId("enquiry", id));
        enquiryRepository.deleteById(id);
        auditService.record(
                actorId,
                actorId,
                AuditAction.ENQUIRY_DELETED,
                "ENQUIRY",
                id,
                Map.of("reference", existing.reference()));
        log.info("Enquiry {} hard-deleted by {}", existing.reference(), actorId);
    }

    private void rejectSpam(EnquiryRequestDTO request) {
        if (request.company() != null && !request.company().isBlank()) {
            throw new SpamRejectedException("honeypot field filled");
        }
        var minDwell = properties.enquiry().minDwellMs();
        if (request.dwellMs() == null || request.dwellMs() < minDwell) {
            throw new SpamRejectedException("submission dwell time below minimum");
        }
    }

    private void enforceRateLimit(String ipHash) {
        var limit = properties.enquiry().rateLimit().perHourPerIp();
        var oneHourAgo = Instant.now().minus(1, ChronoUnit.HOURS);
        if (enquiryRepository.countByMeta_IpHashAndCreatedAtAfter(ipHash, oneHourAgo) >= limit) {
            throw new TooManyRequestsException("enquiry rate limit exceeded");
        }
    }

    /** Delegates to the shared {@link IpHasher} — kept as a seam for tests. */
    String hashIp(String clientIp) {
        return ipHasher.hash(clientIp);
    }

    /** {@code ENQ-YYYY-NNNNNN}, sequential per year via an atomic counter (spec §7.4). */
    private String nextReference(Instant now) {
        var year = ZonedDateTime.ofInstant(now, ZoneOffset.UTC).getYear();
        var counter = mongoTemplate.findAndModify(
                Query.query(Criteria.where("_id").is("enquiry-" + year)),
                new Update().inc("seq", 1),
                FindAndModifyOptions.options().upsert(true).returnNew(true),
                Counter.class);
        return "ENQ-%d-%06d".formatted(year, counter == null ? 1 : counter.seq());
    }
}
