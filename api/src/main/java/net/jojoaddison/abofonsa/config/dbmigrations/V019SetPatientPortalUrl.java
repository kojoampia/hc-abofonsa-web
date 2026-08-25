package net.jojoaddison.abofonsa.config.dbmigrations;

import java.util.List;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/**
 * Gives an existing database the {@code patientPortalUrl} that V002 now seeds.
 *
 * <p>V002 has already run everywhere that matters and never runs again, so without this the landing
 * page's "Create your account" button would appear in development and in tests and be absent in
 * production — the worst of the two states, because the state everything is verified against would be
 * the state nobody is served. The same reasoning as {@code V015BackfillSiteSettingsVersion}.
 *
 * <p>Conditional on the field being absent or null, so an editor who has already pointed it somewhere
 * — or who has deliberately cleared it to take the button down — is not overruled by the next deploy.
 */
@Component
public class V019SetPatientPortalUrl implements Changelog {

    static final String PATIENT_PORTAL_URL = "https://patient.abofonsa.com";

    @Override
    public String id() {
        return "V019_set_patient_portal_url";
    }

    @Override
    public void execute(MongoTemplate mongoTemplate) {
        mongoTemplate
                .getCollection("siteSettings")
                .updateMany(
                        new Document(
                                "$or",
                                List.of(
                                        new Document("patientPortalUrl", new Document("$exists", false)),
                                        new Document("patientPortalUrl", null))),
                        new Document("$set", new Document("patientPortalUrl", PATIENT_PORTAL_URL)));
    }
}
