package net.jojoaddison.abofonsa.content;

import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.common.Locale;
import net.jojoaddison.abofonsa.content.ContentRevisionDocument.EntityType;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

/**
 * Writes an immutable {@link ContentRevisionDocument} on every content save (spec §8.2/§9.3
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

    public ContentRevisionDocument recordRevision(
            ContentEntity entity,
            EntityType entityType,
            String changeSummary,
            List<Locale> changedLocales,
            String actorId) {
        var nextRevisionNumber = repository
                .findTopByEntityTypeAndEntityIdOrderByRevisionNumberDesc(entityType, entity.id())
                .map(r -> r.revisionNumber() + 1)
                .orElse(1);

        var snapshot = new Document();
        mongoTemplate.getConverter().write(entity, snapshot);

        var revision = new ContentRevisionDocument(
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

    public List<ContentRevisionDocument> history(EntityType entityType, String entityId) {
        return repository.findByEntityTypeAndEntityIdOrderByRevisionNumberDesc(entityType, entityId);
    }
}
