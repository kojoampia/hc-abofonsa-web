package net.jojoaddison.abofonsa.domain;

import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.domain.enumeration.EnquiryStatus;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

/**
 * A consultation enquiry (spec §8.2 {@code enquiries}). The {@code message} field may contain
 * health information volunteered by the sender and is treated as sensitive throughout (spec
 * §13.3): never logged, never exported, readable only by authenticated staff. The raw IP is never
 * stored — only a salted hash for rate limiting. {@code retentionExpiresAt} drives the MongoDB
 * TTL index created in V001 (24-month retention).
 */
@Document(collection = "enquiries")
public record Enquiry(
        @Id String id,
        int schemaVersion,
        String reference,
        String name,
        String phone,
        String email,
        String planOfInterest,
        String relationship,
        String message,
        String locale,
        String sourcePage,
        EnquiryStatus status,
        String assignedTo,
        List<Note> notes,
        Meta meta,
        @Field("retentionExpiresAt") Instant retentionExpiresAt,
        Instant createdAt) {

    public record Note(Instant at, String by, String text) {}

    public record Meta(String ipHash, String userAgent, Instant submittedAt) {}
}
