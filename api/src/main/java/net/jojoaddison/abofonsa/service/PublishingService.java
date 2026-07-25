package net.jojoaddison.abofonsa.service;

import static net.jojoaddison.abofonsa.config.CacheConfiguration.I18N_BUNDLE;
import static net.jojoaddison.abofonsa.config.CacheConfiguration.SITE_CONTENT;

import java.time.Instant;
import java.util.Map;
import net.jojoaddison.abofonsa.domain.enumeration.AuditAction;
import net.jojoaddison.abofonsa.domain.enumeration.ContentType;
import net.jojoaddison.abofonsa.web.rest.errors.ConflictException;
import net.jojoaddison.abofonsa.web.rest.errors.UnprocessableContentException;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

/**
 * The publication workflow (spec §9.5, plan tasks 45-48, 50). Any state change that affects the
 * public site evicts every locale of both caches — the aggregate payload spans all of them, and
 * publishes are infrequent enough that global eviction beats fine-grained invalidation (§7.8).
 */
@Service
public class PublishingService {

    private final MongoTemplate mongoTemplate;
    private final ContentAdminService contentAdminService;
    private final ContentRevisionService revisionService;
    private final AuditService auditService;

    public PublishingService(
            MongoTemplate mongoTemplate,
            ContentAdminService contentAdminService,
            ContentRevisionService revisionService,
            AuditService auditService) {
        this.mongoTemplate = mongoTemplate;
        this.contentAdminService = contentAdminService;
        this.revisionService = revisionService;
        this.auditService = auditService;
    }

    @CacheEvict(
            cacheNames = {SITE_CONTENT, I18N_BUNDLE},
            allEntries = true)
    public void publish(ContentType type, String id, String actorId) {
        var document = contentAdminService.findRequired(type, id);

        // E-6: English is the fallback for every locale, so publishing incomplete English is
        // refused with the exact offending fields.
        var gaps = LocalizedDocumentSupport.englishGaps(document);
        if (!gaps.isEmpty()) {
            throw new UnprocessableContentException("English content is incomplete", gaps);
        }
        // R-5/E-10: a testimonial names a real person in a healthcare context - no consent
        // evidence, no publication. Enforced here, not only in the UI (spec §8.2).
        if (type == ContentType.TESTIMONIAL) {
            var consent = document.get("consent", Document.class);
            if (consent == null || !Boolean.TRUE.equals(consent.getBoolean("obtained"))) {
                throw new ConflictException("Publishing requires recorded consent (consent.obtained must be true)");
            }
        }
        // Spec §8.5: exactly one plan may be featured among published plans.
        if (type == ContentType.PLAN && Boolean.TRUE.equals(document.getBoolean("featured"))) {
            var otherFeatured = mongoTemplate
                    .getCollection(ContentAdminService.collectionOf(type))
                    .countDocuments(new Document("featured", true)
                            .append("status", "PUBLISHED")
                            .append("_id", new Document("$ne", new ObjectId(id))));
            if (otherFeatured > 0) {
                throw new ConflictException(
                        "Exactly one plan may be featured; another featured plan is already published");
            }
        }

        var latestRevision = revisionService.history(type, id).stream()
                .findFirst()
                .map(r -> r.id())
                .orElse(null);
        mongoTemplate.updateFirst(
                Query.query(Criteria.where("_id").is(new ObjectId(id))),
                new Update()
                        .set("status", "PUBLISHED")
                        .set("publishedRevisionId", latestRevision)
                        .set("updatedAt", Instant.now())
                        .set("updatedBy", actorId),
                ContentAdminService.collectionOf(type));
        auditService.record(actorId, actorId, AuditAction.CONTENT_PUBLISHED, type.name(), id, Map.of());
    }

    @CacheEvict(
            cacheNames = {SITE_CONTENT, I18N_BUNDLE},
            allEntries = true)
    public void unpublish(ContentType type, String id, String actorId) {
        contentAdminService.findRequired(type, id);
        mongoTemplate.updateFirst(
                Query.query(Criteria.where("_id").is(new ObjectId(id))),
                new Update()
                        .set("status", "DRAFT")
                        .set("updatedAt", Instant.now())
                        .set("updatedBy", actorId),
                ContentAdminService.collectionOf(type));
        auditService.record(actorId, actorId, AuditAction.CONTENT_UNPUBLISHED, type.name(), id, Map.of());
    }

    /** Soft delete (spec §8.1): documents are never physically removed, they become ARCHIVED. */
    @CacheEvict(
            cacheNames = {SITE_CONTENT, I18N_BUNDLE},
            allEntries = true)
    public void archive(ContentType type, String id, String actorId) {
        contentAdminService.findRequired(type, id);
        mongoTemplate.updateFirst(
                Query.query(Criteria.where("_id").is(new ObjectId(id))),
                new Update()
                        .set("status", "ARCHIVED")
                        .set("updatedAt", Instant.now())
                        .set("updatedBy", actorId),
                ContentAdminService.collectionOf(type));
        auditService.record(actorId, actorId, AuditAction.CONTENT_ARCHIVED, type.name(), id, Map.of());
    }

    /** Roll back (task 50): the snapshot becomes the current document as a NEW revision — history
     * is append-only, restoring never rewrites it (E-5). */
    @CacheEvict(
            cacheNames = {SITE_CONTENT, I18N_BUNDLE},
            allEntries = true)
    public void restore(ContentType type, String id, int revisionNumber, String actorId) {
        var current = contentAdminService.findRequired(type, id);
        var revision = revisionService.required(type, id, revisionNumber);

        var restored = new Document(revision.snapshot());
        restored.put("_id", new ObjectId(id));
        // Restoring reverts CONTENT, not lifecycle: a published entity stays published (that is
        // what makes journey 8's "the public site reverts" true), a draft stays draft.
        restored.put("status", current.getString("status"));
        var currentVersion = current.get("version") instanceof Number n ? n.longValue() : 0L;
        restored.put("version", currentVersion + 1);
        restored.put("updatedAt", Instant.now());
        restored.put("updatedBy", actorId);

        mongoTemplate
                .getCollection(ContentAdminService.collectionOf(type))
                .replaceOne(new Document("_id", new ObjectId(id)), restored);
        var newRevision = revisionService.recordRawRevision(
                type,
                id,
                restored,
                String.valueOf(restored.get("status")),
                "restored from revision " + revisionNumber,
                actorId);
        if ("PUBLISHED".equals(restored.get("status"))) {
            mongoTemplate.updateFirst(
                    Query.query(Criteria.where("_id").is(new ObjectId(id))),
                    new Update().set("publishedRevisionId", newRevision.id()),
                    ContentAdminService.collectionOf(type));
        }
        auditService.record(
                actorId,
                actorId,
                AuditAction.REVISION_RESTORED,
                type.name(),
                id,
                Map.of("revisionNumber", revisionNumber));
    }

    /** Reorder also reaches the public site, so it shares the eviction semantics. */
    @CacheEvict(
            cacheNames = {SITE_CONTENT, I18N_BUNDLE},
            allEntries = true)
    public void reorder(ContentType type, java.util.List<String> orderedIds, String actorId) {
        contentAdminService.reorder(type, orderedIds, actorId);
    }
}
