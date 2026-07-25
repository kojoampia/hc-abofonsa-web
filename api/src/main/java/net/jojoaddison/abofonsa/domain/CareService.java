package net.jojoaddison.abofonsa.domain;

import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.domain.enumeration.PublicationStatus;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

/** One of the six service slides in the carousel (spec §8.2 {@code services}). */
@Document(collection = "services")
public record CareService(
        @Id String id,
        int schemaVersion,
        String slug,
        LocalizedText name,
        LocalizedText blurb,
        List<LocalizedText> points,
        LocalizedText availableOn,
        @Field("imageId") String imageId,
        int displayOrder,
        PublicationStatus status,
        @Field("publishedRevisionId") String publishedRevisionId,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy,
        @Version Long version)
        implements ContentEntity {}
