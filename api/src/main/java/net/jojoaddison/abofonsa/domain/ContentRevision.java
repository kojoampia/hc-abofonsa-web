package net.jojoaddison.abofonsa.domain;

import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.domain.enumeration.ContentType;
import net.jojoaddison.abofonsa.domain.enumeration.Locale;
import net.jojoaddison.abofonsa.domain.enumeration.PublicationStatus;
import org.bson.Document;
import org.springframework.data.annotation.Id;

/**
 * Append-only history for every {@link ContentEntity} (spec §8.2 {@code contentRevisions}). Rows
 * are never updated after insert — {@code ContentRevisionService} only ever {@code save()}s a
 * brand-new document, id {@code null}, letting Mongo assign a fresh {@code ObjectId} each time.
 */
@org.springframework.data.mongodb.core.mapping.Document(collection = "contentRevisions")
public record ContentRevision(
        @Id String id,
        int schemaVersion,
        ContentType entityType,
        String entityId,
        int revisionNumber,
        /** A complete snapshot of the entity document at this revision, in its raw BSON shape. */
        Document snapshot,
        PublicationStatus status,
        String changeSummary,
        List<Locale> changedLocales,
        Instant createdAt,
        String createdBy) {}
