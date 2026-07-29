package net.jojoaddison.abofonsa.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import net.jojoaddison.abofonsa.domain.enumeration.AuditAction;
import net.jojoaddison.abofonsa.domain.enumeration.ContentType;
import net.jojoaddison.abofonsa.service.dto.ContentAdminDTO;
import net.jojoaddison.abofonsa.web.rest.errors.ConflictException;
import net.jojoaddison.abofonsa.web.rest.errors.ContentNotFoundException;
import org.bson.Document;
import org.bson.types.Decimal128;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

/**
 * Generic CRUD over the six content types (spec §7.5, plan tasks 42-44, 49). One raw-document
 * code path serves every type: MongoDB's JSON Schema validators (V001) enforce structure, and
 * {@link LocalizedDocumentSupport} enforces the localisation rules. Type-specific business gates
 * (consent, featured-plan) live in {@link PublishingService}.
 */
@Service
public class ContentAdminService {

    /** Server-owned fields a client body can never set directly. */
    private static final List<String> PROTECTED_FIELDS = List.of(
            "_id",
            "version",
            "status",
            "publishedRevisionId",
            "createdAt",
            "createdBy",
            "updatedAt",
            "updatedBy",
            "schemaVersion");

    private final MongoTemplate mongoTemplate;
    private final ContentRevisionService revisionService;
    private final AuditService auditService;
    private final MediaService mediaService;

    public ContentAdminService(
            MongoTemplate mongoTemplate,
            ContentRevisionService revisionService,
            AuditService auditService,
            MediaService mediaService) {
        this.mongoTemplate = mongoTemplate;
        this.revisionService = revisionService;
        this.auditService = auditService;
        this.mediaService = mediaService;
    }

    public static String collectionOf(ContentType type) {
        return switch (type) {
            case SERVICE -> "services";
            case PLAN -> "plans";
            case TESTIMONIAL -> "testimonials";
            case FAQ -> "faqs";
            case SECTION -> "sections";
            case CAREER_TRACK -> "careerTracks";
            case SETTINGS -> "siteSettings";
        };
    }

    public List<ContentAdminDTO> list(ContentType type) {
        return mongoTemplate.find(new Query(), Document.class, collectionOf(type)).stream()
                .map(doc -> toDto(type, doc))
                .toList();
    }

    public ContentAdminDTO get(ContentType type, String id) {
        return toDto(type, findRequired(type, id));
    }

    public ContentAdminDTO create(ContentType type, Map<String, Object> body, String actorId) {
        if (type == ContentType.SETTINGS) {
            throw new ConflictException("siteSettings is a singleton and cannot be created");
        }
        var document = sanitize(type, body);
        var now = Instant.now();
        document.put("schemaVersion", 1);
        document.put("status", "DRAFT");
        document.put("version", 0L);
        document.put("createdAt", now);
        document.put("updatedAt", now);
        document.put("createdBy", actorId);
        document.put("updatedBy", actorId);

        mongoTemplate.getCollection(collectionOf(type)).insertOne(document);
        var id = document.getObjectId("_id").toHexString();
        revisionService.recordRawRevision(type, id, document, "DRAFT", "created", actorId);
        mediaService.syncReferences(type, id, document);
        auditService.record(actorId, actorId, AuditAction.CONTENT_CREATED, type.name(), id, Map.of());
        return toDto(type, document);
    }

    /** Optimistic update (E-9): the write only lands when {@code expectedVersion} still matches;
     * a loser gets 409 carrying the current document so the CMS can offer a diff. */
    public ContentAdminDTO update(
            ContentType type, String id, Map<String, Object> body, long expectedVersion, String actorId) {
        var existing = findRequired(type, id);
        var updated = sanitize(type, body);
        // Server-owned fields carry over from the stored document, never from the client.
        for (var field : PROTECTED_FIELDS) {
            if (existing.containsKey(field)) {
                updated.put(field, existing.get(field));
            }
        }
        updated.put("version", expectedVersion + 1);
        updated.put("updatedAt", Instant.now());
        updated.put("updatedBy", actorId);

        var result = mongoTemplate
                .getCollection(collectionOf(type))
                .replaceOne(new Document("_id", new ObjectId(id)).append("version", expectedVersion), updated);
        if (result.getModifiedCount() == 0) {
            var current = findRequired(type, id);
            // A HashMap, not Map.of: `version` is absent on documents written before it existed, and
            // Map.of rejects nulls — which turned every such conflict into a 500 that hid the real
            // cause. A missing version is exactly the case worth reporting clearly.
            var details = new java.util.HashMap<String, Object>();
            details.put("currentVersion", current.get("version"));
            details.put("current", current);
            throw new ConflictException("The entity was modified by someone else", details);
        }
        revisionService.recordRawRevision(type, id, updated, String.valueOf(updated.get("status")), "updated", actorId);
        mediaService.syncReferences(type, id, updated);
        auditService.record(actorId, actorId, AuditAction.CONTENT_UPDATED, type.name(), id, Map.of());
        return toDto(type, updated);
    }

    /** Reorder (task 49): {@code displayOrder} follows the given id order, 1-based. */
    public void reorder(ContentType type, List<String> orderedIds, String actorId) {
        for (int i = 0; i < orderedIds.size(); i++) {
            mongoTemplate.updateFirst(
                    Query.query(Criteria.where("_id").is(new ObjectId(orderedIds.get(i)))),
                    new org.springframework.data.mongodb.core.query.Update()
                            .set("displayOrder", i + 1)
                            .set("updatedAt", Instant.now())
                            .set("updatedBy", actorId),
                    collectionOf(type));
        }
        auditService.record(
                actorId,
                actorId,
                AuditAction.CONTENT_UPDATED,
                type.name(),
                null,
                Map.of("reordered", orderedIds.size()));
    }

    Document findRequired(ContentType type, String id) {
        var document = mongoTemplate.findById(new ObjectId(id), Document.class, collectionOf(type));
        if (document == null) {
            throw ContentNotFoundException.forId(type.name().toLowerCase(java.util.Locale.ROOT), id);
        }
        return document;
    }

    private ContentAdminDTO toDto(ContentType type, Document document) {
        var id = document.get("_id") instanceof ObjectId oid ? oid.toHexString() : String.valueOf(document.get("_id"));
        var map = jsonSafe(document);
        map.put("_id", id);
        var version = document.get("version") instanceof Number n ? n.longValue() : null;
        return new ContentAdminDTO(
                id, type, document.getString("status"), version, LocalizedDocumentSupport.completeness(document), map);
    }

    /** Recursively replaces BSON-only types with JSON-friendly ones: {@code Decimal128} becomes
     * {@code BigDecimal}, {@code ObjectId} its hex string — Jackson would otherwise mangle both. */
    @SuppressWarnings("unchecked")
    public static java.util.LinkedHashMap<String, Object> jsonSafe(Map<String, Object> document) {
        var out = new java.util.LinkedHashMap<String, Object>();
        document.forEach((key, value) -> out.put(key, jsonSafeValue(value)));
        return out;
    }

    private static Object jsonSafeValue(Object value) {
        if (value instanceof Decimal128 decimal) {
            return decimal.bigDecimalValue();
        }
        if (value instanceof ObjectId oid) {
            return oid.toHexString();
        }
        if (value instanceof Map<?, ?> map) {
            return jsonSafe((Map<String, Object>) map);
        }
        if (value instanceof List<?> list) {
            return list.stream().map(ContentAdminService::jsonSafeValue).toList();
        }
        return value;
    }

    /** Copies the client body into a fresh Document, dropping protected fields and fixing BSON
     * types JSON cannot express — plan prices must be Decimal128, never a double (spec §8.2). */
    private Document sanitize(ContentType type, Map<String, Object> body) {
        var document = new Document(body);
        PROTECTED_FIELDS.forEach(document::remove);
        if (type == ContentType.PLAN && document.get("price") instanceof Map<?, ?> price) {
            var priceDoc = new Document((Map<String, Object>) price);
            if (priceDoc.get("amount") instanceof Number amount && !(priceDoc.get("amount") instanceof Decimal128)) {
                priceDoc.put("amount", new Decimal128(new BigDecimal(amount.toString())));
            }
            document.put("price", priceDoc);
        }
        return document;
    }
}
