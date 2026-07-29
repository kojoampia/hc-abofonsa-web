package net.jojoaddison.abofonsa.config.dbmigrations;

import static org.assertj.core.api.Assertions.assertThat;

import net.jojoaddison.abofonsa.AbstractIntegrationTest;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * The backfill that makes an already-deployed database editable (careers-plan.md task 144).
 *
 * <p>A freshly seeded database cannot exercise this: V002 writes {@code version} now, so V015 finds
 * nothing to do and passing would prove nothing. Each test therefore recreates the shape production
 * was actually found in — a settings document with no {@code version} at all — and runs the
 * changelog against it.
 */
class V015BackfillSiteSettingsVersionTest extends AbstractIntegrationTest {

    @Autowired
    private V015BackfillSiteSettingsVersion changelog;

    private Document settings() {
        return mongoTemplate.getCollection("siteSettings").find().first();
    }

    @Test
    void aDocumentWrittenBeforeTheVersionFieldExistedGetsOne() {
        mongoTemplate
                .getCollection("siteSettings")
                .updateMany(new Document(), new Document("$unset", new Document("version", "")));
        assertThat(settings().get("version"))
                .as("precondition: the pre-C4 shape")
                .isNull();

        changelog.execute(mongoTemplate);

        assertThat(settings().get("version"))
                .as("without this the admin update's {_id, version} match finds nothing, forever")
                .isEqualTo(0L);
    }

    /**
     * The important half. Resetting a live edit counter would hand the next editor a spurious
     * conflict against a document nobody had touched, and the changelog runner's idempotence is not
     * the only thing that should prevent it — a hand-run or a re-registered changelog would too.
     */
    @Test
    void aDocumentThatAlreadyHasAVersionIsLeftAlone() {
        mongoTemplate
                .getCollection("siteSettings")
                .updateMany(new Document(), new Document("$set", new Document("version", 7L)));

        changelog.execute(mongoTemplate);

        assertThat(settings().get("version")).isEqualTo(7L);
    }

    @Test
    void runningItTwiceChangesNothingTheSecondTime() {
        mongoTemplate
                .getCollection("siteSettings")
                .updateMany(new Document(), new Document("$unset", new Document("version", "")));

        changelog.execute(mongoTemplate);
        var afterFirst = settings().get("version");
        changelog.execute(mongoTemplate);

        assertThat(settings().get("version")).isEqualTo(afterFirst);
    }
}
