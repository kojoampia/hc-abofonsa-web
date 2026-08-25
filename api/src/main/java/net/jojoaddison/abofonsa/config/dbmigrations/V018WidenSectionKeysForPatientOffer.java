package net.jojoaddison.abofonsa.config.dbmigrations;

import java.util.Set;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.schema.JsonSchemaProperty;
import org.springframework.data.mongodb.core.schema.MongoJsonSchema;
import org.springframework.stereotype.Component;

/**
 * Admits {@code PATIENT_OFFER} to the {@code sections.key} enumeration, ahead of the seed that uses
 * it.
 *
 * <p>V001 installs a {@code $jsonSchema} validator pinning that field to a closed set, and V011
 * widened it once already for the careers keys. The validator earns its keep every time: the first
 * attempt to seed this section was refused outright with
 * {@code "value was not found in enum", consideredValue: "PATIENT_OFFER"} — a loud failure at insert
 * time rather than a document written now and found unreadable later.
 *
 * <p>Separate from the seed and numbered before it because {@link ChangelogRunner} orders by id, and
 * the validator has to be widened before anything tries to write through it. Same shape as V011 →
 * V012–V014.
 *
 * <p>The full set is restated rather than appended to, because {@code collMod} replaces a validator
 * wholesale — reading the installed one, adding a value and writing it back would be three round
 * trips to end up with the same document this builds in one.
 */
@Component
public class V018WidenSectionKeysForPatientOffer implements Changelog {

    @Override
    public String id() {
        return "V018_widen_section_keys_for_patient_offer";
    }

    @Override
    public void execute(MongoTemplate mongoTemplate) {
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
                                        "PATIENT_OFFER",
                                        "CAREERS_HERO",
                                        "CAREERS_LIFE",
                                        "CAREERS_PROCESS",
                                        "CAREERS_CTA")),
                        JsonSchemaProperty.string("status").possibleValues(Set.of("DRAFT", "PUBLISHED", "ARCHIVED")))
                .build();

        mongoTemplate.executeCommand(new Document("collMod", "sections")
                .append("validator", schema.toDocument())
                .append("validationLevel", "strict")
                .append("validationAction", "error"));
    }
}
