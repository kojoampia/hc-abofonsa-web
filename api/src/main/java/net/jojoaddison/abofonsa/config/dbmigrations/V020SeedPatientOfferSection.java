package net.jojoaddison.abofonsa.config.dbmigrations;

import static net.jojoaddison.abofonsa.config.dbmigrations.SeedText.lt;

import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.domain.Section;
import net.jojoaddison.abofonsa.domain.enumeration.PublicationStatus;
import net.jojoaddison.abofonsa.domain.enumeration.SectionKey;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/**
 * The landing page's offer to families: the first month of care is free.
 *
 * <p><b>Content, not code, and deliberately so.</b> This is a commercial promise with a price on it —
 * a free month is worth GH₵3,000 to GH₵8,000 depending on plan — and the one thing certain about a
 * promotion is that it ends. Seeding it as a {@code SECTION} means an editor withdraws or amends it
 * by unpublishing a document, in the time it takes to press publish, rather than by waiting for a
 * release. The band renders only while this section is published, exactly as the other home-page
 * sections do.
 *
 * <p>Localised into all four languages rather than English-only. Careers copy is English-only by
 * decision (careers-plan.md D-5) because applicants are in Ghana; families are in the diaspora, which
 * is the whole reason this site has four locales at all. An offer a Spanish-speaking daughter in
 * Madrid cannot read is not an offer.
 *
 * <p>Runs after V018, which widens the {@code sections.key} validator to admit {@code PATIENT_OFFER}
 * — {@code ChangelogRunner} orders by id. Without that ordering MongoDB refuses this insert outright,
 * which is exactly what it did on the first attempt here, and what it did to the careers seeds before
 * V011 widened the same enumeration.
 *
 * <p><b>The offer ends on 31 January 2027</b> (confirmed 2026-08-25), and the copy says so. A
 * promotion whose end date lives only in a planning document is one a customer can argue was never
 * communicated — and one that quietly becomes permanent, since nothing here expires on its own.
 * V021 puts the same sentence into databases seeded before the date was known.
 *
 * <p><b>The terms are stated in the offer itself.</b> The pricing cards say "Minimum three-month term
 * · 30 days' notice", and a free first month has to sit alongside that rather than appear to
 * contradict it on the same page: the commitment is unchanged, the first month of it costs nothing.
 * Saying so here means no existing pricing copy has to be rewritten to stay true — which matters,
 * because that copy is the client's and lives in their database, not in this repository.
 */
@Component
public class V020SeedPatientOfferSection implements Changelog {

    @Override
    public String id() {
        return "V020_seed_patient_offer_section";
    }

    @Override
    public void execute(MongoTemplate mongoTemplate) {
        var now = Instant.now();
        mongoTemplate.insert(new Section(
                null,
                1,
                SectionKey.PATIENT_OFFER,
                lt(
                        "Your first month is free",
                        "Su primer mes es gratis",
                        "Votre premier mois est offert",
                        "Ihr erster Monat ist kostenlos"),
                lt(
                        "Start care at home this week, and pay nothing for the first month",
                        "Comience la atención en casa esta semana y no pague nada el primer mes",
                        "Commencez les soins à domicile cette semaine, sans rien payer le premier mois",
                        "Beginnen Sie diese Woche mit der Pflege zu Hause — der erste Monat kostet Sie nichts"),
                lt(
                        "Creating an account and the first clinical assessment cost nothing, and neither does"
                                + " your first month of scheduled care.",
                        "Crear una cuenta y la primera evaluación clínica no tienen coste, y su primer mes de"
                                + " atención programada tampoco.",
                        "La création d'un compte et la première évaluation clinique sont gratuites, tout comme"
                                + " votre premier mois de soins programmés.",
                        "Die Erstellung eines Kontos und die erste klinische Beurteilung sind kostenlos — und Ihr"
                                + " erster Monat geplanter Pflege ebenfalls."),
                // The terms, in the same breath as the offer. A promotion that hides its conditions one
                // scroll away from the claim is the kind of thing that gets read back to you later.
                lt(
                        "Free month applies to the first month of any plan and to subscriptions started on or"
                                + " before 31 January 2027. The minimum three-month term and 30 days' notice shown"
                                + " on each plan still apply.",
                        "El mes gratuito se aplica al primer mes de cualquier plan y a las suscripciones"
                                + " iniciadas hasta el 31 de enero de 2027. Siguen vigentes el plazo mínimo de tres"
                                + " meses y el preaviso de 30 días indicados en cada plan.",
                        "Le mois offert s'applique au premier mois de tout forfait et aux abonnements souscrits"
                                + " jusqu'au 31 janvier 2027. La durée minimale de trois mois et le préavis de 30"
                                + " jours indiqués sur chaque forfait restent applicables.",
                        "Der Gratismonat gilt für den ersten Monat jedes Tarifs und für Abschlüsse bis zum"
                                + " 31. Januar 2027. Die auf jedem Tarif genannte Mindestlaufzeit von drei Monaten"
                                + " und die Frist von 30 Tagen gelten weiterhin."),
                List.of(),
                null,
                PublicationStatus.PUBLISHED,
                null,
                now,
                now,
                "usr_admin",
                "usr_admin",
                null));
    }
}
