package net.jojoaddison.abofonsa.config.dbmigrations;

import static org.assertj.core.api.Assertions.assertThat;

import net.jojoaddison.abofonsa.AbstractIntegrationTest;
import org.bson.Document;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * The migration that adds the offer's end date to copy seeded before the date existed.
 *
 * <p>A freshly seeded database already carries the date — V020 writes it now — so the first test puts
 * the pre-date sentence back, which is the shape production was in when the offer first went live.
 */
class V021AddOfferEndDateTest extends AbstractIntegrationTest {

    private static final String BEFORE_EN =
            "Free month applies to the first month of any plan. The minimum three-month term and"
                    + " 30 days' notice shown on each plan still apply.";

    private static final String AFTER_EN =
            "Free month applies to the first month of any plan and to subscriptions started on or"
                    + " before 31 January 2027. The minimum three-month term and 30 days' notice shown"
                    + " on each plan still apply.";

    @Autowired
    private V021AddOfferEndDate changelog;

    /**
     * Reads the field by the path Spring Data actually writes — {@code body.en}, lowercase and with no
     * {@code values} wrapper, whatever {@code LocalizedText}'s own toString suggests.
     *
     * <p>The first version of this test fabricated {@code body.values.EN}, wrote the "before" text
     * there and asserted the migration rewrote it. It passed, and proved nothing: the migration was
     * matching that same imaginary path against production documents that have never had it, updating
     * zero rows and reporting success. This now asserts against the document V020 seeded, so a wrong
     * path fails here instead of on the live site.
     */
    private String bodyEn() {
        var doc = mongoTemplate
                .getCollection("sections")
                .find(new Document("key", "PATIENT_OFFER"))
                .first();
        assertThat(doc)
                .as("V020 seeds this section; without it the test asserts on nothing")
                .isNotNull();
        return doc.getEmbedded(java.util.List.of("body", "en"), String.class);
    }

    private void setBodyEn(String text) {
        mongoTemplate
                .getCollection("sections")
                .updateMany(new Document("key", "PATIENT_OFFER"), new Document("$set", new Document("body.en", text)));
    }

    /**
     * One container, one database, no reset between classes — and this class deliberately writes
     * nonsense into published commercial copy. Put the seeded wording back, or the next class to read
     * the site payload reads "Our own wording, thank you."
     */
    @AfterEach
    void restoreTheSeededWording() {
        setBodyEn(AFTER_EN);
    }

    /** The seeded document really does carry the sentence this migration matches on. */
    @Test
    void theSeededWordingIsWhatTheMigrationLooksFor() {
        assertThat(bodyEn()).isEqualTo(AFTER_EN);
    }

    @Test
    void copySeededBeforeTheDateWasKnownGainsIt() {
        setBodyEn(BEFORE_EN);

        changelog.execute(mongoTemplate);

        assertThat(bodyEn())
                .as("the page is the only one of these promises anybody reads")
                .contains("31 January 2027")
                .contains("minimum three-month term");
    }

    /**
     * The important half. Commercial copy is the client's, and an editor who has reworded these terms
     * has seen a version of them this migration has not. Skipping their locale is the right failure;
     * overwriting it is not.
     */
    @Test
    void wordingAnEditorHasChangedIsLeftAlone() {
        setBodyEn("Our own wording, thank you.");

        changelog.execute(mongoTemplate);

        assertThat(bodyEn()).isEqualTo("Our own wording, thank you.");
    }

    @Test
    void runningItTwiceChangesNothingTheSecondTime() {
        setBodyEn(BEFORE_EN);

        changelog.execute(mongoTemplate);
        var afterFirst = bodyEn();
        changelog.execute(mongoTemplate);

        assertThat(bodyEn()).isEqualTo(afterFirst);
    }
}
