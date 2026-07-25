package net.jojoaddison.abofonsa.domain;

import java.time.Instant;
import net.jojoaddison.abofonsa.domain.enumeration.FaqCategory;
import net.jojoaddison.abofonsa.domain.enumeration.PublicationStatus;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

/** A frequently-asked question, grouped by {@link FaqCategory} (spec §8.2 {@code faqs}). */
@Document(collection = "faqs")
public record Faq(
        @Id String id,
        int schemaVersion,
        LocalizedText question,
        LocalizedText answer,
        FaqCategory category,
        int displayOrder,
        PublicationStatus status,
        @Field("publishedRevisionId") String publishedRevisionId,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy,
        @Version Long version)
        implements ContentEntity {}
