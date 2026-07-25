package net.jojoaddison.abofonsa.content;

import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.common.Locale;
import net.jojoaddison.abofonsa.common.PublicationStatus;
import org.bson.Document;
import org.springframework.data.annotation.Id;

/**
 * Append-only history for every {@link net.jojoaddison.abofonsa.content.ContentEntity} (spec §8.2
 * {@code contentRevisions}). Rows are never updated after insert — {@link ContentRevisionService}
 * only ever {@code save()}s a brand-new document, id {@code null}, letting Mongo assign a fresh
 * {@code ObjectId} each time.
 */
@org.springframework.data.mongodb.core.mapping.Document(collection = "contentRevisions")
public record ContentRevisionDocument(
        @Id String id,
        int schemaVersion,
        EntityType entityType,
        String entityId,
        int revisionNumber,
        /** A complete snapshot of the entity document at this revision, in its raw BSON shape. */
        Document snapshot,
        PublicationStatus status,
        String changeSummary,
        List<Locale> changedLocales,
        Instant createdAt,
        String createdBy) {

    public enum EntityType {
        SERVICE,
        PLAN,
        TESTIMONIAL,
        FAQ,
        SECTION,
        SETTINGS
    }
}
