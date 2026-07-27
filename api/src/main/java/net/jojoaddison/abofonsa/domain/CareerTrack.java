package net.jojoaddison.abofonsa.domain;

import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.domain.enumeration.AuthorityRole;
import net.jojoaddison.abofonsa.domain.enumeration.PublicationStatus;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

/**
 * One recruited role on the careers page (careers-plan.md §4).
 *
 * <p>{@code requirements} and {@code documents} are the load-bearing fields, not decoration: with
 * self-service enrolment (D-1) nothing stands between a curious visitor and the credentialing
 * reviewer's queue except how clearly this page states them. {@code documents} mirrors step 6 of
 * the onboarding workflow, so an applicant who reads it arrives with what will be asked for and is
 * not returned for correction.
 *
 * <p>{@code openings} distinguishes "we are hiring for this" from "this track exists but has no
 * rota yet" (D-2). Three of the six roles are advertised ahead of the product, and saying so is
 * the difference between recruiting early and implying a vacancy that cannot be filled.
 */
@Document(collection = "careerTracks")
public record CareerTrack(
        @Id String id,
        int schemaVersion,
        String slug,
        LocalizedText title,
        LocalizedText blurb,
        List<LocalizedText> requirements,
        List<LocalizedText> documents,
        @Field("authorityRole") AuthorityRole authorityRole,
        boolean openings,
        int displayOrder,
        PublicationStatus status,
        @Field("publishedRevisionId") String publishedRevisionId,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy,
        @Version Long version)
        implements ContentEntity {}
