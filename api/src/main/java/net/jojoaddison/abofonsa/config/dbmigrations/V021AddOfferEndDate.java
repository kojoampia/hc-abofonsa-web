package net.jojoaddison.abofonsa.config.dbmigrations;

import java.util.Map;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/**
 * Puts the offer's end date — 31 January 2027 — into the copy of a database seeded before it was
 * known.
 *
 * <p>V020 seeded the free-month offer without an end date because there was not one yet; it was
 * settled the same day the offer went live. V020 has already run everywhere and never runs again, so
 * without this the live page would go on promising a free month with no deadline while the checklist
 * and the seed both said 31 January 2027 — the mismatch being the one that matters, since only the
 * page is a promise to anybody.
 *
 * <p><b>Only rewrites the sentence it seeded.</b> Each locale is matched on the exact V020 text and
 * replaced with the same text plus the date. An editor who has since reworded the terms keeps their
 * wording and this quietly does nothing to that locale — which is the right failure: a migration that
 * overwrote hand-edited commercial copy would be worse than one that skipped it, and the editor is
 * the one who can see what they wrote.
 *
 * <p>Nothing here expires on its own. On 1 February 2027 somebody unpublishes the section
 * ({@code GO-LIVE-CHECKLIST.md} §2). Until then the page states its own deadline, which is the
 * difference between an offer that ends and one that merely stops being true.
 */
@Component
public class V021AddOfferEndDate implements Changelog {

    /** V020's terms sentence per locale, and the same sentence carrying the date. */
    private static final Map<String, String[]> TERMS = Map.of(
            "en",
                    new String[] {
                        "Free month applies to the first month of any plan. The minimum three-month term and"
                                + " 30 days' notice shown on each plan still apply.",
                        "Free month applies to the first month of any plan and to subscriptions started on or"
                                + " before 31 January 2027. The minimum three-month term and 30 days' notice shown"
                                + " on each plan still apply."
                    },
            "es",
                    new String[] {
                        "El mes gratuito se aplica al primer mes de cualquier plan. Siguen vigentes el plazo"
                                + " mínimo de tres meses y el preaviso de 30 días indicados en cada plan.",
                        "El mes gratuito se aplica al primer mes de cualquier plan y a las suscripciones"
                                + " iniciadas hasta el 31 de enero de 2027. Siguen vigentes el plazo mínimo de tres"
                                + " meses y el preaviso de 30 días indicados en cada plan."
                    },
            "fr",
                    new String[] {
                        "Le mois offert s'applique au premier mois de tout forfait. La durée minimale de trois"
                                + " mois et le préavis de 30 jours indiqués sur chaque forfait restent applicables.",
                        "Le mois offert s'applique au premier mois de tout forfait et aux abonnements souscrits"
                                + " jusqu'au 31 janvier 2027. La durée minimale de trois mois et le préavis de 30"
                                + " jours indiqués sur chaque forfait restent applicables."
                    },
            "de",
                    new String[] {
                        "Der Gratismonat gilt für den ersten Monat jedes Tarifs. Die auf jedem Tarif genannte"
                                + " Mindestlaufzeit von drei Monaten und die Frist von 30 Tagen gelten weiterhin.",
                        "Der Gratismonat gilt für den ersten Monat jedes Tarifs und für Abschlüsse bis zum"
                                + " 31. Januar 2027. Die auf jedem Tarif genannte Mindestlaufzeit von drei Monaten"
                                + " und die Frist von 30 Tagen gelten weiterhin."
                    });

    @Override
    public String id() {
        return "V021_add_offer_end_date";
    }

    @Override
    public void execute(MongoTemplate mongoTemplate) {
        var sections = mongoTemplate.getCollection("sections");
        TERMS.forEach((locale, texts) -> {
            // body.en, not body.values.EN. LocalizedText is a record wrapping Map<Locale, String>,
            // and a converter flattens it to lowercase locale keys directly under the field — the
            // record's own toString prints "LocalizedText[values={EN=...}]", which is what the first
            // version of this migration was written against. It matched nothing, updated nothing, and
            // said nothing: updateMany on a path that does not exist is a successful no-op. The unit
            // test agreed with it, because the test wrote the same imaginary path before asserting on
            // it. Reading one real document is what found it.
            var field = "body." + locale;
            sections.updateMany(
                    new Document("key", "PATIENT_OFFER").append(field, texts[0]),
                    new Document("$set", new Document(field, texts[1])));
        });
    }
}
