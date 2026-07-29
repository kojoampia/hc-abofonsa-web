package net.jojoaddison.abofonsa.config.dbmigrations;

import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/**
 * Gives the existing {@code siteSettings} document a {@code version}, so it can be edited at all.
 *
 * <p>{@link net.jojoaddison.abofonsa.domain.SiteSettings} gained {@code @Version} in Phase C4, which
 * fixes freshly seeded databases — V002 writes the field now. It does nothing for a database that
 * already exists: V002 has run there and never runs again, so production kept a settings document
 * with no {@code version}, and the admin update matches on {@code {_id, version}}. Without this
 * backfill the CMS settings screen stays unsaveable exactly where it matters.
 *
 * <p>That is not cosmetic in this phase. {@code professionalPortalUrl} is the switch that brings the
 * careers apply buttons back when professional.abofonsa.com is finally serving (careers-plan.md task
 * 144), and it is set through this screen. An unsaveable settings document means a switch welded to
 * "off", which would have looked exactly like the feature working — the buttons are meant to be
 * hidden right now — until the day someone tried to turn it on.
 *
 * <p>Only {@code siteSettings} is affected: every other content type has carried {@code @Version}
 * since it was created, verified against production before writing this (0 of 43 documents across
 * the other six collections were missing it, against 1 of 1 here).
 *
 * <p>Deliberately conditional. Documents that already have a version keep it — this must not reset
 * an edit counter and hand someone a false conflict, and the changelog runner's own idempotence is
 * not the only thing standing between that and production.
 */
@Component
public class V015BackfillSiteSettingsVersion implements Changelog {

    @Override
    public String id() {
        return "V015_backfill_site_settings_version";
    }

    @Override
    public void execute(MongoTemplate mongoTemplate) {
        mongoTemplate
                .getCollection("siteSettings")
                .updateMany(
                        new Document("version", new Document("$exists", false)),
                        new Document("$set", new Document("version", 0L)));
    }
}
