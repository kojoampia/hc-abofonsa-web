package net.jojoaddison.abofonsa.repository;

import java.time.Instant;
import java.util.Optional;
import net.jojoaddison.abofonsa.domain.Enquiry;
import net.jojoaddison.abofonsa.domain.enumeration.EnquiryStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface EnquiryRepository extends MongoRepository<Enquiry, String> {

    Optional<Enquiry> findByReference(String reference);

    Page<Enquiry> findByStatusOrderByCreatedAtDesc(EnquiryStatus status, Pageable pageable);

    Page<Enquiry> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /** Backs the 5/hour/IP rate limit (spec §7.7) — {@code meta.ipHash} traversal via underscore. */
    long countByMeta_IpHashAndCreatedAtAfter(String ipHash, Instant after);
}
