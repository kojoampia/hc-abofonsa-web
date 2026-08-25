package net.jojoaddison.abofonsa.config.dbmigrations;

import static org.assertj.core.api.Assertions.assertThat;

import net.jojoaddison.abofonsa.AbstractIntegrationTest;
import org.bson.Document;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * The migration that gives an already-deployed database the patient portal URL V002 now seeds.
 *
 * <p>A freshly seeded database has it, so these tests remove it first — which is the shape production
 * is in, V002 having run there long before this field existed.
 */
class V019SetPatientPortalUrlTest extends AbstractIntegrationTest {

    @Autowired
    private V019SetPatientPortalUrl changelog;

    private Document settings() {
        return mongoTemplate.getCollection("siteSettings").find().first();
    }

    private void setPortal(Object value) {
        mongoTemplate
                .getCollection("siteSettings")
                .updateMany(new Document(), new Document("$set", new Document("patientPortalUrl", value)));
    }

    /** One container, one database, no reset between classes — leave it as the seed has it. */
    @AfterEach
    void restoreTheSeededValue() {
        setPortal(V019SetPatientPortalUrl.PATIENT_PORTAL_URL);
    }

    @Test
    void aDatabaseFromBeforeTheFieldExistedGetsIt() {
        mongoTemplate
                .getCollection("siteSettings")
                .updateMany(new Document(), new Document("$unset", new Document("patientPortalUrl", "")));

        changelog.execute(mongoTemplate);

        assertThat(settings().get("patientPortalUrl"))
                .as("without this the sign-up button exists in dev and tests and not in production")
                .isEqualTo("https://patient.abofonsa.com");
    }

    @Test
    void aNullValueIsTreatedAsAbsent() {
        setPortal(null);

        changelog.execute(mongoTemplate);

        assertThat(settings().get("patientPortalUrl")).isEqualTo("https://patient.abofonsa.com");
    }

    /**
     * The important half: clearing this field is how the button comes down if patient.abofonsa.com
     * stops answering. A deploy that silently re-armed it would take that lever away.
     */
    @Test
    void anEditorsOwnValueSurvives() {
        setPortal("https://patients.example.org");

        changelog.execute(mongoTemplate);

        assertThat(settings().get("patientPortalUrl")).isEqualTo("https://patients.example.org");
    }
}
