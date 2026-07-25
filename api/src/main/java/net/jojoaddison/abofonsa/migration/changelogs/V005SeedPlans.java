package net.jojoaddison.abofonsa.migration.changelogs;

import static net.jojoaddison.abofonsa.migration.changelogs.SeedText.lt;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.common.PublicationStatus;
import net.jojoaddison.abofonsa.content.PlanDocument;
import net.jojoaddison.abofonsa.content.PlanDocument.Comparison;
import net.jojoaddison.abofonsa.content.PlanDocument.PlanFeature;
import net.jojoaddison.abofonsa.content.PlanDocument.Price;
import net.jojoaddison.abofonsa.migration.Changelog;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/**
 * PEAR, PAWPAW and MELON, using the canonical values table in spec §8.5 — the single source of
 * truth for prices; if a price ever changes, it changes here first. Feature/comparison copy is
 * transcribed from the {@code PLANS}/{@code PTABLE} arrays in {@code Abofonsa_BridgeCare_Website.html}.
 */
@Component
public class V005SeedPlans implements Changelog {

    @Override
    public String id() {
        return "V005_seed_plans";
    }

    @Override
    public void execute(MongoTemplate mongoTemplate) {
        mongoTemplate.insertAll(List.of(pear(), pawpaw(), melon()));
    }

    private PlanDocument pear() {
        var features = List.of(
                new PlanFeature(
                        lt("5 weekly visits", "5 visitas semanales", "5 visites hebdomadaires", "5 Besuche pro Woche"),
                        true,
                        true),
                new PlanFeature(
                        lt("Nursing support", "Apoyo de enfermería", "Soutien infirmier", "Pflegerische Unterstützung"),
                        true,
                        false),
                new PlanFeature(
                        lt(
                                "Cleaning, washing and grocery",
                                "Limpieza, lavado y compras",
                                "Ménage, lessive et courses",
                                "Reinigung, Wäsche und Einkauf"),
                        true,
                        false),
                new PlanFeature(
                        lt(
                                "Written report after every visit",
                                "Informe escrito después de cada visita",
                                "Rapport écrit après chaque visite",
                                "Schriftlicher Bericht nach jedem Besuch"),
                        true,
                        false),
                new PlanFeature(
                        lt(
                                "Vital signs monitoring",
                                "Monitoreo de signos vitales",
                                "Surveillance des signes vitaux",
                                "Überwachung der Vitalwerte"),
                        true,
                        false),
                new PlanFeature(
                        lt(
                                "Doctor review included",
                                "Revisión médica incluida",
                                "Suivi médical inclus",
                                "Ärztliche Kontrolle inbegriffen"),
                        false,
                        false),
                new PlanFeature(
                        lt(
                                "24/7 on-call availability",
                                "Disponibilidad de guardia 24/7",
                                "Disponibilité d'astreinte 24 h/24",
                                "24/7 Bereitschaftsdienst"),
                        false,
                        false));
        var comparison = new Comparison(
                lt("5 weekly visits", "5 visitas semanales", "5 visites hebdomadaires", "5 Besuche pro Woche"),
                lt("Nursing support", "Apoyo de enfermería", "Soutien infirmier", "Pflegerische Unterstützung"),
                lt(
                        "Cleaning, washing, grocery",
                        "Limpieza, lavado, compras",
                        "Ménage, lessive, courses",
                        "Reinigung, Wäsche, Einkauf"),
                lt("Included", "Incluido", "Inclus", "Inbegriffen"),
                lt("After every visit", "Después de cada visita", "Après chaque visite", "Nach jedem Besuch"),
                lt("Shared", "Compartido", "Partagé", "Geteilt"));
        return plan(
                "PEAR",
                lt("PEAR Plan", "Plan PEAR", "Forfait PEAR", "PEAR-Tarif"),
                lt(
                        "A dependable weekday routine for a relative who is broadly well but should not be" + " alone.",
                        "Una rutina confiable de lunes a viernes para un familiar que está generalmente bien"
                                + " pero no debería estar solo.",
                        "Une routine fiable en semaine pour un proche globalement en bonne santé mais qui ne"
                                + " devrait pas rester seul.",
                        "Ein verlässlicher Wochentagsablauf für einen Angehörigen, dem es weitgehend gut geht,"
                                + " der aber nicht allein sein sollte."),
                new Price(new BigDecimal("3000.00"), "GHS", "MONTH"),
                lt(
                        "Minimum three-month term · 30 days' notice",
                        "Plazo mínimo de tres meses · 30 días de preaviso",
                        "Engagement minimum de trois mois · préavis de 30 jours",
                        "Mindestlaufzeit drei Monate · 30 Tage Kündigungsfrist"),
                false,
                features,
                comparison,
                1);
    }

    private PlanDocument pawpaw() {
        var features = List.of(
                new PlanFeature(
                        lt("7 weekly visits", "7 visitas semanales", "7 visites hebdomadaires", "7 Besuche pro Woche"),
                        true,
                        true),
                new PlanFeature(
                        lt(
                                "Nursing and doctor support",
                                "Apoyo de enfermería y médico",
                                "Soutien infirmier et médical",
                                "Pflegerische und ärztliche Unterstützung"),
                        true,
                        true),
                new PlanFeature(
                        lt(
                                "Cleaning, cooking, grocery, personal care",
                                "Limpieza, cocina, compras, cuidado personal",
                                "Ménage, cuisine, courses, soins personnels",
                                "Reinigung, Kochen, Einkauf, Körperpflege"),
                        true,
                        false),
                new PlanFeature(
                        lt(
                                "Written report after every visit",
                                "Informe escrito después de cada visita",
                                "Rapport écrit après chaque visite",
                                "Schriftlicher Bericht nach jedem Besuch"),
                        true,
                        false),
                new PlanFeature(
                        lt(
                                "Vital signs monitoring",
                                "Monitoreo de signos vitales",
                                "Surveillance des signes vitaux",
                                "Überwachung der Vitalwerte"),
                        true,
                        false),
                new PlanFeature(
                        lt(
                                "Priority scheduling and named carer",
                                "Programación prioritaria y cuidador asignado",
                                "Planification prioritaire et aidant attitré",
                                "Bevorzugte Planung und feste Pflegekraft"),
                        true,
                        false),
                new PlanFeature(
                        lt(
                                "24/7 on-call availability",
                                "Disponibilidad de guardia 24/7",
                                "Disponibilité d'astreinte 24 h/24",
                                "24/7 Bereitschaftsdienst"),
                        false,
                        false));
        var comparison = new Comparison(
                lt("7 weekly visits", "7 visitas semanales", "7 visites hebdomadaires", "7 Besuche pro Woche"),
                lt("Nursing & doctor", "Enfermería y médico", "Infirmier et médecin", "Pflege & Arzt"),
                lt(
                        "Cleaning, cooking, grocery, personal care",
                        "Limpieza, cocina, compras, cuidado personal",
                        "Ménage, cuisine, courses, soins personnels",
                        "Reinigung, Kochen, Einkauf, Körperpflege"),
                lt("Included", "Incluido", "Inclus", "Inbegriffen"),
                lt("After every visit", "Después de cada visita", "Après chaque visite", "Nach jedem Besuch"),
                lt("Shared", "Compartido", "Partagé", "Geteilt"));
        return plan(
                "PAWPAW",
                lt("PAWPAW Plan", "Plan PAWPAW", "Forfait PAWPAW", "PAWPAW-Tarif"),
                lt(
                        "Daily clinical oversight for someone managing a long-term condition or recovering at"
                                + " home.",
                        "Supervisión clínica diaria para alguien que maneja una condición a largo plazo o se"
                                + " recupera en casa.",
                        "Un suivi clinique quotidien pour une personne gérant une pathologie chronique ou en"
                                + " convalescence à domicile.",
                        "Tägliche klinische Betreuung für jemanden mit einer langfristigen Erkrankung oder in"
                                + " häuslicher Genesung."),
                new Price(new BigDecimal("5000.00"), "GHS", "MONTH"),
                lt(
                        "Most commonly chosen plan · 30 days' notice",
                        "Plan más elegido · 30 días de preaviso",
                        "Le forfait le plus choisi · préavis de 30 jours",
                        "Am häufigsten gewählter Tarif · 30 Tage Kündigungsfrist"),
                true,
                features,
                comparison,
                2);
    }

    private PlanDocument melon() {
        var features = List.of(
                new PlanFeature(
                        lt("24/7 availability", "Disponibilidad 24/7", "Disponibilité 24 h/24", "24/7 Verfügbarkeit"),
                        true,
                        true),
                new PlanFeature(
                        lt(
                                "Nursing and doctor support",
                                "Apoyo de enfermería y médico",
                                "Soutien infirmier et médical",
                                "Pflegerische und ärztliche Unterstützung"),
                        true,
                        true),
                new PlanFeature(
                        lt(
                                "All auxiliary services included",
                                "Todos los servicios auxiliares incluidos",
                                "Tous les services auxiliaires inclus",
                                "Alle Nebenleistungen inbegriffen"),
                        true,
                        false),
                new PlanFeature(
                        lt(
                                "Written report after every visit",
                                "Informe escrito después de cada visita",
                                "Rapport écrit après chaque visite",
                                "Schriftlicher Bericht nach jedem Besuch"),
                        true,
                        false),
                new PlanFeature(
                        lt(
                                "Vital signs monitoring",
                                "Monitoreo de signos vitales",
                                "Surveillance des signes vitaux",
                                "Überwachung der Vitalwerte"),
                        true,
                        false),
                new PlanFeature(
                        lt(
                                "Priority scheduling and named carer",
                                "Programación prioritaria y cuidador asignado",
                                "Planification prioritaire et aidant attitré",
                                "Bevorzugte Planung und feste Pflegekraft"),
                        true,
                        false),
                new PlanFeature(
                        lt(
                                "Dedicated care manager",
                                "Gestor de cuidados dedicado",
                                "Gestionnaire de soins dédié",
                                "Fester Pflegekoordinator"),
                        true,
                        false));
        var comparison = new Comparison(
                lt("24/7 availability", "Disponibilidad 24/7", "Disponibilité 24 h/24", "24/7 Verfügbarkeit"),
                lt("Nursing & doctor", "Enfermería y médico", "Infirmier et médecin", "Pflege & Arzt"),
                lt("All inclusive", "Todo incluido", "Tout inclus", "Alles inklusive"),
                lt(
                        "Included, with overnight review",
                        "Incluido, con revisión nocturna",
                        "Inclus, avec suivi nocturne",
                        "Inbegriffen, mit nächtlicher Kontrolle"),
                lt("After every visit", "Después de cada visita", "Après chaque visite", "Nach jedem Besuch"),
                lt("Dedicated", "Dedicado", "Dédié", "Fest zugeteilt"));
        return plan(
                "MELON",
                lt("MELON Plan", "Plan MELON", "Forfait MELON", "MELON-Tarif"),
                lt(
                        "Continuous cover for complex, palliative or high-dependency care needs.",
                        "Cobertura continua para necesidades de cuidado complejas, paliativas o de alta"
                                + " dependencia.",
                        "Une couverture continue pour des besoins de soins complexes, palliatifs ou à forte"
                                + " dépendance.",
                        "Durchgehende Betreuung für komplexe, palliative oder hochgradig"
                                + " pflegebedürftige Situationen."),
                new Price(new BigDecimal("8000.00"), "GHS", "MONTH"),
                lt(
                        "Includes overnight cover · 30 days' notice",
                        "Incluye cobertura nocturna · 30 días de preaviso",
                        "Inclut la couverture de nuit · préavis de 30 jours",
                        "Inklusive Nachtbetreuung · 30 Tage Kündigungsfrist"),
                false,
                features,
                comparison,
                3);
    }

    private PlanDocument plan(
            String code,
            net.jojoaddison.abofonsa.common.LocalizedText name,
            net.jojoaddison.abofonsa.common.LocalizedText forWho,
            Price price,
            net.jojoaddison.abofonsa.common.LocalizedText priceNote,
            boolean featured,
            List<PlanFeature> features,
            Comparison comparison,
            int displayOrder) {
        return new PlanDocument(
                null,
                1,
                code,
                name,
                forWho,
                price,
                priceNote,
                featured,
                features,
                comparison,
                displayOrder,
                PublicationStatus.PUBLISHED,
                null,
                Instant.now(),
                Instant.now(),
                "usr_admin",
                "usr_admin",
                null);
    }
}
