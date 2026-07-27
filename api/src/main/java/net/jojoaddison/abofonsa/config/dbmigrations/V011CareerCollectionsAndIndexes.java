package net.jojoaddison.abofonsa.config.dbmigrations;

import com.mongodb.client.model.ValidationAction;
import com.mongodb.client.model.ValidationLevel;
import java.util.Set;
import org.bson.Document;
import org.springframework.data.mongodb.core.CollectionOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.schema.JsonSchemaProperty;
import org.springframework.data.mongodb.core.schema.MongoJsonSchema;
import org.springframework.data.mongodb.core.validation.Validator;
import org.springframework.stereotype.Component;

/**
 * Schema for the careers content (careers-plan.md Phase C1), ahead of the seeds that populate it.
 *
 * <p>V001 installs {@code $jsonSchema} validators that pin {@code sections.key} and
 * {@code faqs.category} to closed enumerations. That is the point of them — and it worked: the
 * first attempt to seed a {@code CAREERS_HERO} section was refused by MongoDB with
 * "value was not found in enum" rather than quietly writing a document the application would later
 * fail to read. Widening those two enumerations is therefore a deliberate migration, not an
 * oversight being corrected.
 *
 * <p>Runs as V011 so the validators are in place before V012-V014 insert anything;
 * {@code ChangelogRunner} orders by id.
 */
@Component
public class V011CareerCollectionsAndIndexes implements Changelog {

    @Override
    public String id() {
        return "V011_career_collections_and_indexes";
    }

    @Override
    public void execute(MongoTemplate mongoTemplate) {
        widenSectionKeys(mongoTemplate);
        widenFaqCategories(mongoTemplate);
        createCareerTracks(mongoTemplate);
    }

    /** The four careers keys join the seven home-page ones. */
    private void widenSectionKeys(MongoTemplate mongoTemplate) {
        var schema = MongoJsonSchema.builder()
                .required("key", "status", "schemaVersion")
                .properties(
                        JsonSchemaProperty.string("key")
                                .possibleValues(Set.of(
                                        "HERO",
                                        "ASSURANCE",
                                        "PROCESS",
                                        "APPROACH",
                                        "STATS",
                                        "ANGEL",
                                        "CTA",
                                        "CAREERS_HERO",
                                        "CAREERS_LIFE",
                                        "CAREERS_PROCESS",
                                        "CAREERS_CTA")),
                        JsonSchemaProperty.string("status").possibleValues(Set.of("DRAFT", "PUBLISHED", "ARCHIVED")))
                .build();
        replaceValidator(mongoTemplate, "sections", schema);
    }

    private void widenFaqCategories(MongoTemplate mongoTemplate) {
        var schema = MongoJsonSchema.builder()
                .required("question", "answer", "category", "status", "schemaVersion")
                .properties(
                        JsonSchemaProperty.string("category")
                                .possibleValues(Set.of("COVERAGE", "STAFF", "PLANS", "CLINICAL", "BILLING", "CAREERS")),
                        JsonSchemaProperty.string("status").possibleValues(Set.of("DRAFT", "PUBLISHED", "ARCHIVED")))
                .build();
        replaceValidator(mongoTemplate, "faqs", schema);
    }

    private void createCareerTracks(MongoTemplate mongoTemplate) {
        var schema = MongoJsonSchema.builder()
                .required("slug", "title", "authorityRole", "status", "displayOrder", "schemaVersion")
                .properties(
                        JsonSchemaProperty.string("slug"),
                        // English is required at the schema level for the same reason it is on every
                        // other content type: the fallback resolves to English, so a track without it
                        // renders as nothing at all in every locale (spec §10.4, R-3).
                        JsonSchemaProperty.required(JsonSchemaProperty.object("title")
                                .properties(JsonSchemaProperty.string("en").minLength(1))
                                .required("en")),
                        // Must stay in step with AuthorityRole, which in turn mirrors the ROLE_*
                        // constants professional.abofonsa.com authorizes against. A value outside this
                        // set would produce a handoff link that repo cannot interpret.
                        JsonSchemaProperty.string("authorityRole")
                                .possibleValues(Set.of(
                                        "ROLE_NURSE",
                                        "ROLE_CARER",
                                        "ROLE_DOCTOR",
                                        "ROLE_PARAMEDIC",
                                        "ROLE_PHARMACIST",
                                        "ROLE_THERAPIST")),
                        JsonSchemaProperty.string("status").possibleValues(Set.of("DRAFT", "PUBLISHED", "ARCHIVED")),
                        JsonSchemaProperty.int32("displayOrder"))
                .build();

        mongoTemplate.createCollection(
                "careerTracks",
                CollectionOptions.empty()
                        .validator(Validator.schema(schema))
                        .schemaValidationLevel(ValidationLevel.STRICT)
                        .schemaValidationAction(ValidationAction.ERROR));

        mongoTemplate
                .indexOps("careerTracks")
                .ensureIndex(new Index("slug", org.springframework.data.domain.Sort.Direction.ASC).unique());
        mongoTemplate
                .indexOps("careerTracks")
                .ensureIndex(new org.springframework.data.mongodb.core.index.CompoundIndexDefinition(
                        new Document("status", 1).append("displayOrder", 1)));
    }

    /**
     * Replaces an existing collection's validator in place. {@code collMod} is the only way to do
     * this — {@code createCollection} would fail on a collection that already exists, and there is
     * no Spring Data abstraction for altering one.
     */
    private void replaceValidator(MongoTemplate mongoTemplate, String collection, MongoJsonSchema schema) {
        mongoTemplate.executeCommand(new Document("collMod", collection)
                .append("validator", schema.toDocument())
                .append("validationLevel", "strict")
                .append("validationAction", "error"));
    }
}
