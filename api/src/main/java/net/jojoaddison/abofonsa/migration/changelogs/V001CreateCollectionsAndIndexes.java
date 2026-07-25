package net.jojoaddison.abofonsa.migration.changelogs;

import com.mongodb.client.model.ValidationAction;
import com.mongodb.client.model.ValidationLevel;
import java.util.Set;
import net.jojoaddison.abofonsa.migration.Changelog;
import org.springframework.data.mongodb.core.CollectionOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.schema.JsonSchemaProperty;
import org.springframework.data.mongodb.core.schema.MongoJsonSchema;
import org.springframework.data.mongodb.core.validation.Validator;
import org.springframework.stereotype.Component;

/**
 * Collections, JSON Schema validators, and indexes for all 11 collections (spec §8.2/§8.3/§8.4).
 * {@code auto-index-creation} is off (application.yml), so every index here is explicit,
 * reviewable, and applied exactly once — matching the spec's stated rationale.
 *
 * <p>The spec gives one fully worked JSON Schema example ({@code plans}, §8.4); the schemas below
 * for the other content collections follow the same pattern (required core fields, English
 * mandatory on localised text per §8.4's "Requiring {@code en} on every localised field enforces
 * the fallback guarantee"). Operational collections (media, adminUsers, enquiries, auditLog,
 * contentRevisions, uiTranslationOverrides) get lighter required-field-only validation — they
 * aren't part of the multilingual content model this rule targets.
 */
@Component
public class V001CreateCollectionsAndIndexes implements Changelog {

    @Override
    public String id() {
        return "V001_create_collections_and_indexes";
    }

    @Override
    public void execute(MongoTemplate mongoTemplate) {
        createServices(mongoTemplate);
        createPlans(mongoTemplate);
        createTestimonials(mongoTemplate);
        createFaqs(mongoTemplate);
        createSections(mongoTemplate);
        createSiteSettings(mongoTemplate);
        createUiTranslationOverrides(mongoTemplate);
        createContentRevisions(mongoTemplate);
        createMedia(mongoTemplate);
        createAdminUsers(mongoTemplate);
        createEnquiries(mongoTemplate);
        createAuditLog(mongoTemplate);
    }

    private static JsonSchemaProperty localizedText(String name, boolean requireEnglish) {
        var enProperty = JsonSchemaProperty.string("en").minLength(requireEnglish ? 1 : 0);
        var object = JsonSchemaProperty.object(name).properties(enProperty);
        return requireEnglish ? JsonSchemaProperty.required(object.required("en")) : object;
    }

    private void createValidatedCollection(MongoTemplate mongoTemplate, String name, MongoJsonSchema schema) {
        var options = CollectionOptions.empty()
                .validator(Validator.schema(schema))
                .schemaValidationLevel(ValidationLevel.STRICT)
                .schemaValidationAction(ValidationAction.ERROR);
        mongoTemplate.createCollection(name, options);
    }

    private void createServices(MongoTemplate mongoTemplate) {
        var schema = MongoJsonSchema.builder()
                .required("slug", "name", "status", "displayOrder", "schemaVersion")
                .properties(
                        JsonSchemaProperty.string("slug"),
                        localizedText("name", true),
                        JsonSchemaProperty.string("status").possibleValues(Set.of("DRAFT", "PUBLISHED", "ARCHIVED")),
                        JsonSchemaProperty.int32("displayOrder"))
                .build();
        createValidatedCollection(mongoTemplate, "services", schema);
        mongoTemplate
                .indexOps("services")
                .ensureIndex(new Index("slug", org.springframework.data.domain.Sort.Direction.ASC).unique());
        mongoTemplate
                .indexOps("services")
                .ensureIndex(new org.springframework.data.mongodb.core.index.CompoundIndexDefinition(
                        new org.bson.Document("status", 1).append("displayOrder", 1)));
    }

    private void createPlans(MongoTemplate mongoTemplate) {
        var schema = MongoJsonSchema.builder()
                .required("code", "name", "price", "status", "displayOrder", "schemaVersion")
                .properties(
                        JsonSchemaProperty.string("code").possibleValues(Set.of("PEAR", "PAWPAW", "MELON")),
                        JsonSchemaProperty.string("status").possibleValues(Set.of("DRAFT", "PUBLISHED", "ARCHIVED")),
                        JsonSchemaProperty.object("price")
                                .required("amount", "currency", "period")
                                .properties(
                                        JsonSchemaProperty.decimal128("amount"),
                                        JsonSchemaProperty.string("currency").possibleValues(Set.of("GHS")),
                                        JsonSchemaProperty.string("period")
                                                .possibleValues(Set.of("MONTH", "WEEK", "VISIT"))),
                        localizedText("name", true),
                        JsonSchemaProperty.int32("displayOrder"))
                .build();
        createValidatedCollection(mongoTemplate, "plans", schema);
        mongoTemplate
                .indexOps("plans")
                .ensureIndex(new Index("code", org.springframework.data.domain.Sort.Direction.ASC).unique());
        mongoTemplate
                .indexOps("plans")
                .ensureIndex(new org.springframework.data.mongodb.core.index.CompoundIndexDefinition(
                        new org.bson.Document("status", 1).append("displayOrder", 1)));
    }

    private void createTestimonials(MongoTemplate mongoTemplate) {
        var schema = MongoJsonSchema.builder()
                .required("quote", "personName", "rating", "status", "schemaVersion")
                .properties(
                        localizedText("quote", true),
                        JsonSchemaProperty.string("personName"),
                        JsonSchemaProperty.int32("rating"),
                        JsonSchemaProperty.string("status").possibleValues(Set.of("DRAFT", "PUBLISHED", "ARCHIVED")))
                .build();
        createValidatedCollection(mongoTemplate, "testimonials", schema);
        mongoTemplate
                .indexOps("testimonials")
                .ensureIndex(new org.springframework.data.mongodb.core.index.CompoundIndexDefinition(
                        new org.bson.Document("status", 1).append("displayOrder", 1)));
    }

    private void createFaqs(MongoTemplate mongoTemplate) {
        var schema = MongoJsonSchema.builder()
                .required("question", "answer", "category", "status", "schemaVersion")
                .properties(
                        localizedText("question", true),
                        localizedText("answer", true),
                        JsonSchemaProperty.string("category")
                                .possibleValues(Set.of("COVERAGE", "STAFF", "PLANS", "CLINICAL", "BILLING")),
                        JsonSchemaProperty.string("status").possibleValues(Set.of("DRAFT", "PUBLISHED", "ARCHIVED")))
                .build();
        createValidatedCollection(mongoTemplate, "faqs", schema);
        mongoTemplate
                .indexOps("faqs")
                .ensureIndex(new org.springframework.data.mongodb.core.index.CompoundIndexDefinition(
                        new org.bson.Document("status", 1).append("displayOrder", 1)));
        mongoTemplate
                .indexOps("faqs")
                .ensureIndex(new org.springframework.data.mongodb.core.index.CompoundIndexDefinition(
                        new org.bson.Document("category", 1).append("displayOrder", 1)));
    }

    private void createSections(MongoTemplate mongoTemplate) {
        var schema = MongoJsonSchema.builder()
                .required("key", "status", "schemaVersion")
                .properties(
                        JsonSchemaProperty.string("key")
                                .possibleValues(
                                        Set.of("HERO", "ASSURANCE", "PROCESS", "APPROACH", "STATS", "ANGEL", "CTA")),
                        JsonSchemaProperty.string("status").possibleValues(Set.of("DRAFT", "PUBLISHED", "ARCHIVED")))
                .build();
        createValidatedCollection(mongoTemplate, "sections", schema);
        mongoTemplate
                .indexOps("sections")
                .ensureIndex(new Index("key", org.springframework.data.domain.Sort.Direction.ASC).unique());
    }

    private void createSiteSettings(MongoTemplate mongoTemplate) {
        var schema = MongoJsonSchema.builder()
                .required("singleton", "organisationName", "schemaVersion")
                .properties(JsonSchemaProperty.string("singleton").possibleValues(Set.of("SITE")))
                .build();
        createValidatedCollection(mongoTemplate, "siteSettings", schema);
        mongoTemplate
                .indexOps("siteSettings")
                .ensureIndex(new Index("singleton", org.springframework.data.domain.Sort.Direction.ASC).unique());
    }

    private void createUiTranslationOverrides(MongoTemplate mongoTemplate) {
        var schema = MongoJsonSchema.builder()
                .required("locale", "schemaVersion")
                .properties(JsonSchemaProperty.string("locale").possibleValues(Set.of("en", "es", "fr", "de")))
                .build();
        createValidatedCollection(mongoTemplate, "uiTranslationOverrides", schema);
        mongoTemplate
                .indexOps("uiTranslationOverrides")
                .ensureIndex(new Index("locale", org.springframework.data.domain.Sort.Direction.ASC).unique());
    }

    private void createContentRevisions(MongoTemplate mongoTemplate) {
        var schema = MongoJsonSchema.builder()
                .required("entityType", "entityId", "revisionNumber", "schemaVersion")
                .build();
        createValidatedCollection(mongoTemplate, "contentRevisions", schema);
        mongoTemplate
                .indexOps("contentRevisions")
                .ensureIndex(new org.springframework.data.mongodb.core.index.CompoundIndexDefinition(
                        new org.bson.Document("entityType", 1)
                                .append("entityId", 1)
                                .append("revisionNumber", -1)));
        mongoTemplate
                .indexOps("contentRevisions")
                .ensureIndex(new Index("createdAt", org.springframework.data.domain.Sort.Direction.DESC));
    }

    private void createMedia(MongoTemplate mongoTemplate) {
        var schema = MongoJsonSchema.builder()
                .required("filename", "contentType", "storageKey", "schemaVersion")
                .build();
        createValidatedCollection(mongoTemplate, "media", schema);
        mongoTemplate
                .indexOps("media")
                .ensureIndex(new Index("storageKey", org.springframework.data.domain.Sort.Direction.ASC).unique());
        mongoTemplate
                .indexOps("media")
                .ensureIndex(new Index("createdAt", org.springframework.data.domain.Sort.Direction.DESC));
    }

    private void createAdminUsers(MongoTemplate mongoTemplate) {
        var schema = MongoJsonSchema.builder()
                .required("username", "email", "passwordHash", "roles", "schemaVersion")
                .properties(JsonSchemaProperty.array("roles")
                        .items(org.springframework.data.mongodb.core.schema.JsonSchemaObject.string()
                                .possibleValues(Set.of("VIEWER", "EDITOR", "PUBLISHER", "ADMIN"))))
                .build();
        createValidatedCollection(mongoTemplate, "adminUsers", schema);
        mongoTemplate
                .indexOps("adminUsers")
                .ensureIndex(new Index("username", org.springframework.data.domain.Sort.Direction.ASC).unique());
        mongoTemplate
                .indexOps("adminUsers")
                .ensureIndex(new Index("email", org.springframework.data.domain.Sort.Direction.ASC).unique());
    }

    private void createEnquiries(MongoTemplate mongoTemplate) {
        var schema = MongoJsonSchema.builder()
                .required("reference", "name", "phone", "status", "schemaVersion")
                .properties(JsonSchemaProperty.string("status")
                        .possibleValues(Set.of("NEW", "CONTACTED", "QUALIFIED", "CLOSED")))
                .build();
        createValidatedCollection(mongoTemplate, "enquiries", schema);
        mongoTemplate
                .indexOps("enquiries")
                .ensureIndex(new Index("reference", org.springframework.data.domain.Sort.Direction.ASC).unique());
        mongoTemplate
                .indexOps("enquiries")
                .ensureIndex(new org.springframework.data.mongodb.core.index.CompoundIndexDefinition(
                        new org.bson.Document("status", 1).append("createdAt", -1)));
        // TTL index — spec §8.2/§13.3: 24-month enquiry retention, enforced by MongoDB itself.
        mongoTemplate
                .indexOps("enquiries")
                .ensureIndex(
                        new Index("retentionExpiresAt", org.springframework.data.domain.Sort.Direction.ASC).expire(0));
    }

    private void createAuditLog(MongoTemplate mongoTemplate) {
        var schema = MongoJsonSchema.builder()
                .required("at", "actorId", "action", "schemaVersion")
                .build();
        createValidatedCollection(mongoTemplate, "auditLog", schema);
        mongoTemplate
                .indexOps("auditLog")
                .ensureIndex(new Index("at", org.springframework.data.domain.Sort.Direction.DESC));
        mongoTemplate
                .indexOps("auditLog")
                .ensureIndex(new org.springframework.data.mongodb.core.index.CompoundIndexDefinition(
                        new org.bson.Document("actorId", 1).append("at", -1)));
        mongoTemplate
                .indexOps("auditLog")
                .ensureIndex(new org.springframework.data.mongodb.core.index.CompoundIndexDefinition(
                        new org.bson.Document("entityType", 1)
                                .append("entityId", 1)
                                .append("at", -1)));
    }
}
