package net.jojoaddison.abofonsa.service;

import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.domain.ContentEntity;
import net.jojoaddison.abofonsa.domain.ContentRevision;
import net.jojoaddison.abofonsa.domain.enumeration.ContentType;
import net.jojoaddison.abofonsa.domain.enumeration.Locale;
import net.jojoaddison.abofonsa.domain.enumeration.PublicationStatus;
import net.jojoaddison.abofonsa.repository.ContentRevisionRepository;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

/**
 * Writes an immutable {@link ContentRevision} on every content save (spec §8.2/§9.3
 * E-5: "Saving writes a new revision and never mutates the previous one"). Used by every content
 * vertical slice's create/update path (Phase 6) — kept here rather than duplicated per slice.
 */
@Service
public class ContentRevisionService {

    private final ContentRevisionRepository repository;
    private final MongoTemplate mongoTemplate;

    public ContentRevisionService(ContentRevisionRepository repository, MongoTemplate mongoTemplate) {
        this.repository = repository;
        this.mongoTemplate = mongoTemplate;
    }

    public ContentRevision recordRevision(
            ContentEntity entity,
            ContentType entityType,
            String changeSummary,
            List<Locale> changedLocales,
            String actorId) {
        var nextRevisionNumber = repository
                .findTopByEntityTypeAndEntityIdOrderByRevisionNumberDesc(entityType, entity.id())
                .map(r -> r.revisionNumber() + 1)
                .orElse(1);

        var snapshot = new Document();
        mongoTemplate.getConverter().write(entity, snapshot);

        var revision = new ContentRevision(
                null,
                1,
                entityType,
                entity.id(),
                nextRevisionNumber,
                snapshot,
                entity.status(),
                changeSummary,
                changedLocales,
                Instant.now(),
                actorId);

        return repository.save(revision);
    }

    /** Raw-document twin of {@link #recordRevision} — the generic admin CRUD path (Phase 6)
     * snapshots the exact BSON it wrote, no typed mapping in between. */
    public ContentRevision recordRawRevision(
            ContentType entityType,
            String entityId,
            Document snapshot,
            String status,
            String changeSummary,
            String actorId) {
        var nextRevisionNumber = repository
                .findTopByEntityTypeAndEntityIdOrderByRevisionNumberDesc(entityType, entityId)
                .map(r -> r.revisionNumber() + 1)
                .orElse(1);
        var revision = new ContentRevision(
                null,
                1,
                entityType,
                entityId,
                nextRevisionNumber,
                new Document(snapshot),
                // siteSettings is deliberately outside the publish lifecycle (see SiteSettings) and
                // so carries no status, which arrived here as the string "null" and threw out of
                // valueOf — after the write had already landed, turning a successful settings save
                // into a 500. Revisions of a statusless document are still worth keeping; they just
                // have no status to record.
                statusOrNull(status),
                changeSummary,
                List.of(),
                Instant.now(),
                actorId);
        return repository.save(revision);
    }

    private static PublicationStatus statusOrNull(String status) {
        if (status == null || status.isBlank() || "null".equals(status)) {
            return null;
        }
        return PublicationStatus.valueOf(status);
    }

    public List<ContentRevision> history(ContentType entityType, String entityId) {
        return repository.findByEntityTypeAndEntityIdOrderByRevisionNumberDesc(entityType, entityId);
    }

    public ContentRevision required(ContentType entityType, String entityId, int revisionNumber) {
        return history(entityType, entityId).stream()
                .filter(r -> r.revisionNumber() == revisionNumber)
                .findFirst()
                .orElseThrow(() -> net.jojoaddison.abofonsa.web.rest.errors.ContentNotFoundException.forId(
                        "revision " + revisionNumber + " of", entityId));
    }

    /**
     * Retention (spec §8.2): keep the latest {@code keepLatest} revisions per entity plus every
     * revision that was ever published; prune the rest. Run monthly by
     * {@code RevisionRetentionService}.
     */
    public long prune(ContentType entityType, String entityId, int keepLatest) {
        var history = history(entityType, entityId); // newest first
        var removed = 0L;
        for (int i = keepLatest; i < history.size(); i++) {
            var revision = history.get(i);
            if (revision.status() != PublicationStatus.PUBLISHED) {
                repository.deleteById(revision.id());
                removed++;
            }
        }
        return removed;
    }
}
