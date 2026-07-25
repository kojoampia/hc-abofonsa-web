package net.jojoaddison.abofonsa.content;

import java.time.Instant;
import net.jojoaddison.abofonsa.common.LocalizedText;
import net.jojoaddison.abofonsa.common.PublicationStatus;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

/**
 * A client testimonial (spec §8.2 {@code testimonials}). {@code consent.obtained} must be
 * {@code true} before {@code status} may become {@code PUBLISHED} — enforced in
 * {@code PublishingService} (Phase 6), not merely by this schema.
 */
@Document(collection = "testimonials")
public record TestimonialDocument(
        @Id String id,
        int schemaVersion,
        LocalizedText quote,
        String personName,
        LocalizedText personRole,
        LocalizedText planLabel,
        int rating,
        @Field("portraitId") String portraitId,
        Consent consent,
        int displayOrder,
        PublicationStatus status,
        @Field("publishedRevisionId") String publishedRevisionId,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy,
        @Version Long version)
        implements ContentEntity {

    public record Consent(boolean obtained, Instant obtainedAt, String evidenceRef) {}
}
