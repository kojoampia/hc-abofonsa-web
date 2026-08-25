package net.jojoaddison.abofonsa.config.dbmigrations;

import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/**
 * Removes {@code professionalInvitationUrl} from the settings document, with the button it switched
 * on.
 *
 * <p>The careers page had a secondary "Request an invitation" call-to-action that rendered whenever
 * this field held a value. The reasoning was that presence is a switch which cannot be flipped before
 * the page it points at exists — and it turned out that it can: the field was filled in with the
 * <em>registration</em> URL, so the button went live advertising an invitation flow nobody has built,
 * pointing at the same form the button beside it already linked to.
 *
 * <p>Removed rather than re-gated. careers-plan.md D-1 already decided where that surface belongs if
 * it is ever wanted — in {@code hc-professional}, next to the audit trail, so the email address is
 * captured inside the audited flow rather than on a site whose whole design is to identify nobody.
 * Keeping a switch here for a page that must not be built here was the mistake underneath the
 * mistake.
 *
 * <p>Unsetting matters beyond tidiness. The record no longer has the field, so Spring Data ignores
 * it on read — but the CMS settings editor round-trips the raw document, and a key that no editor can
 * see and no code reads is exactly the sort of thing that gets re-attached to a rebuilt feature years
 * later and quietly switches something on.
 */
@Component
public class V017DropProfessionalInvitationUrl implements Changelog {

    @Override
    public String id() {
        return "V017_drop_professional_invitation_url";
    }

    @Override
    public void execute(MongoTemplate mongoTemplate) {
        mongoTemplate
                .getCollection("siteSettings")
                .updateMany(
                        new Document("professionalInvitationUrl", new Document("$exists", true)),
                        new Document("$unset", new Document("professionalInvitationUrl", "")));
    }
}
