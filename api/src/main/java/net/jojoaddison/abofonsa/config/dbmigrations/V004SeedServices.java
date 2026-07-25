package net.jojoaddison.abofonsa.config.dbmigrations;

import static net.jojoaddison.abofonsa.config.dbmigrations.SeedText.lt;

import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.domain.CareService;
import net.jojoaddison.abofonsa.domain.LocalizedText;
import net.jojoaddison.abofonsa.domain.enumeration.PublicationStatus;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/** The six service slides, transcribed verbatim (English) from the {@code SERVICES} array in
 * {@code Abofonsa_BridgeCare_Website.html}. */
@Component
public class V004SeedServices implements Changelog {

    @Override
    public String id() {
        return "V004_seed_services";
    }

    @Override
    public void execute(MongoTemplate mongoTemplate) {
        mongoTemplate.insertAll(List.of(
                elderlyCompanionCare(),
                skilledNursingVisits(),
                hospitalToHomeRecovery(),
                mentalHealthWellbeing(),
                mobilityPhysicalSupport(),
                dailyLivingAuxiliaryServices()));
    }

    private CareService elderlyCompanionCare() {
        return service(
                "elderly-companion-care",
                lt(
                        "Elderly & companion care",
                        "Atención a personas mayores y compañía",
                        "Aide aux personnes âgées et compagnie",
                        "Seniorenbetreuung und Gesellschaft"),
                lt(
                        "Day-to-day support that helps an older relative stay in their own home safely and"
                                + " with company.",
                        "Apoyo diario que ayuda a un familiar mayor a permanecer en su propio hogar de forma"
                                + " segura y en compañía.",
                        "Un accompagnement quotidien qui aide un proche âgé à rester chez lui en toute"
                                + " sécurité et en bonne compagnie.",
                        "Tägliche Unterstützung, die einem älteren Angehörigen hilft, sicher und in Gesellschaft"
                                + " zu Hause zu bleiben."),
                List.of(
                        lt(
                                "Washing, dressing and personal care",
                                "Aseo, vestimenta y cuidado personal",
                                "Toilette, habillage et soins personnels",
                                "Waschen, Ankleiden und Körperpflege"),
                        lt(
                                "Medication prompting and reconciliation",
                                "Recordatorio y conciliación de medicamentos",
                                "Rappels de médicaments et suivi du traitement",
                                "Medikamentenerinnerung und -abgleich"),
                        lt(
                                "Mobility assistance and falls prevention",
                                "Asistencia para la movilidad y prevención de caídas",
                                "Aide à la mobilité et prévention des chutes",
                                "Mobilitätshilfe und Sturzprävention"),
                        lt(
                                "Companionship and conversation",
                                "Compañía y conversación",
                                "Compagnie et conversation",
                                "Gesellschaft und Gespräche")),
                lt("All plans", "Todos los planes", "Tous les forfaits", "Alle Tarife"),
                1);
    }

    private CareService skilledNursingVisits() {
        return service(
                "skilled-nursing-visits",
                lt(
                        "Skilled nursing visits",
                        "Visitas de enfermería especializada",
                        "Visites infirmières spécialisées",
                        "Fachpflegerische Besuche"),
                lt(
                        "Clinical care delivered at home by registered nurses, with physician review where"
                                + " the plan requires it.",
                        "Atención clínica brindada en el hogar por enfermeras tituladas, con revisión médica"
                                + " cuando el plan lo requiere.",
                        "Des soins cliniques prodigués à domicile par des infirmiers diplômés, avec suivi"
                                + " médical lorsque le forfait le prévoit.",
                        "Klinische Versorgung zu Hause durch examinierte Pflegekräfte, mit ärztlicher Kontrolle,"
                                + " sofern der Tarif dies vorsieht."),
                List.of(
                        lt(
                                "Vital signs, wound care and dressings",
                                "Signos vitales, cuidado de heridas y vendajes",
                                "Signes vitaux, soins des plaies et pansements",
                                "Vitalwerte, Wundversorgung und Verbände"),
                        lt(
                                "Injections, catheter and stoma care",
                                "Inyecciones, cuidado de catéter y estoma",
                                "Injections, soins de cathéter et de stomie",
                                "Injektionen, Katheter- und Stomapflege"),
                        lt(
                                "Chronic condition management",
                                "Manejo de condiciones crónicas",
                                "Prise en charge des maladies chroniques",
                                "Management chronischer Erkrankungen"),
                        lt(
                                "Physician review and prescription follow-up",
                                "Revisión médica y seguimiento de recetas",
                                "Suivi médical et renouvellement des ordonnances",
                                "Ärztliche Kontrolle und Rezeptnachverfolgung")),
                lt(
                        "All plans · doctor review on PAWPAW and MELON",
                        "Todos los planes · revisión médica en PAWPAW y MELON",
                        "Tous les forfaits · suivi médical avec PAWPAW et MELON",
                        "Alle Tarife · ärztliche Kontrolle bei PAWPAW und MELON"),
                2);
    }

    private CareService hospitalToHomeRecovery() {
        return service(
                "hospital-to-home-recovery",
                lt(
                        "Hospital-to-home recovery",
                        "Recuperación del hospital al hogar",
                        "Convalescence de l'hôpital au domicile",
                        "Genesung von der Klinik nach Hause"),
                lt(
                        "Supervised recovery in the weeks after discharge, when the risk of readmission is"
                                + " highest.",
                        "Recuperación supervisada en las semanas posteriores al alta, cuando el riesgo de"
                                + " reingreso es mayor.",
                        "Une convalescence supervisée dans les semaines suivant la sortie, lorsque le risque de"
                                + " réhospitalisation est le plus élevé.",
                        "Betreute Genesung in den Wochen nach der Entlassung, wenn das Risiko einer"
                                + " Wiedereinweisung am höchsten ist."),
                List.of(
                        lt(
                                "Discharge plan reviewed and implemented",
                                "Revisión e implementación del plan de alta",
                                "Examen et mise en œuvre du plan de sortie",
                                "Überprüfung und Umsetzung des Entlassungsplans"),
                        lt(
                                "Wound monitoring and infection watch",
                                "Monitoreo de heridas y vigilancia de infecciones",
                                "Surveillance des plaies et des infections",
                                "Wundüberwachung und Infektionskontrolle"),
                        lt(
                                "Rehabilitation exercises and mobility work",
                                "Ejercicios de rehabilitación y trabajo de movilidad",
                                "Exercices de rééducation et travail de mobilité",
                                "Rehabilitationsübungen und Mobilitätstraining"),
                        lt(
                                "Coordination with the discharging hospital",
                                "Coordinación con el hospital que dio el alta",
                                "Coordination avec l'hôpital ayant prononcé la sortie",
                                "Abstimmung mit dem entlassenden Krankenhaus")),
                lt("PAWPAW and MELON", "PAWPAW y MELON", "PAWPAW et MELON", "PAWPAW und MELON"),
                3);
    }

    private CareService mentalHealthWellbeing() {
        return service(
                "mental-health-wellbeing",
                lt(
                        "Mental health & wellbeing",
                        "Salud mental y bienestar",
                        "Santé mentale et bien-être",
                        "Psychische Gesundheit und Wohlbefinden"),
                lt(
                        "Consistent, respectful support from carers trained in mental health, with clinical"
                                + " escalation available.",
                        "Apoyo constante y respetuoso de cuidadores capacitados en salud mental, con"
                                + " escalamiento clínico disponible.",
                        "Un accompagnement constant et respectueux par des aidants formés à la santé mentale,"
                                + " avec escalade clinique disponible.",
                        "Beständige, respektvolle Unterstützung durch in psychischer Gesundheit geschulte"
                                + " Betreuer, mit verfügbarer klinischer Eskalation."),
                List.of(
                        lt(
                                "Structured daily routine and key working",
                                "Rutina diaria estructurada y trabajo de referencia",
                                "Routine quotidienne structurée et référent dédié",
                                "Strukturierter Tagesablauf und feste Bezugsperson"),
                        lt(
                                "Medication adherence support",
                                "Apoyo para la adherencia a la medicación",
                                "Aide à l'observance du traitement",
                                "Unterstützung bei der Medikamententreue"),
                        lt(
                                "Recovery and relapse-prevention work",
                                "Trabajo de recuperación y prevención de recaídas",
                                "Travail de rétablissement et de prévention des rechutes",
                                "Genesungs- und Rückfallpräventionsarbeit"),
                        lt(
                                "Family liaison and education",
                                "Enlace y educación familiar",
                                "Liaison et information des familles",
                                "Familienkontakt und Aufklärung")),
                lt("PAWPAW and MELON", "PAWPAW y MELON", "PAWPAW et MELON", "PAWPAW und MELON"),
                4);
    }

    private CareService mobilityPhysicalSupport() {
        return service(
                "mobility-physical-support",
                lt(
                        "Mobility & physical support",
                        "Movilidad y apoyo físico",
                        "Mobilité et soutien physique",
                        "Mobilität und körperliche Unterstützung"),
                lt(
                        "Practical assistance for adults living with physical disability or reduced mobility.",
                        "Asistencia práctica para adultos que viven con discapacidad física o movilidad" + " reducida.",
                        "Une aide pratique pour les adultes vivant avec un handicap physique ou une mobilité"
                                + " réduite.",
                        "Praktische Unterstützung für Erwachsene mit körperlicher Behinderung oder"
                                + " eingeschränkter Mobilität."),
                List.of(
                        lt(
                                "Safe transfers and repositioning",
                                "Transferencias seguras y reposicionamiento",
                                "Transferts sécurisés et repositionnement",
                                "Sichere Transfers und Umlagerung"),
                        lt(
                                "Equipment set-up and training",
                                "Instalación y capacitación en equipos",
                                "Installation et formation aux équipements",
                                "Einrichtung und Schulung von Hilfsmitteln"),
                        lt(
                                "Escort to appointments and outings",
                                "Acompañamiento a citas y salidas",
                                "Accompagnement aux rendez-vous et sorties",
                                "Begleitung zu Terminen und Ausflügen"),
                        lt(
                                "Home safety assessment",
                                "Evaluación de seguridad en el hogar",
                                "Évaluation de la sécurité du domicile",
                                "Sicherheitsbewertung der Wohnung")),
                lt("All plans", "Todos los planes", "Tous les forfaits", "Alle Tarife"),
                5);
    }

    private CareService dailyLivingAuxiliaryServices() {
        return service(
                "daily-living-auxiliary-services",
                lt(
                        "Daily living & auxiliary services",
                        "Vida diaria y servicios auxiliares",
                        "Vie quotidienne et services auxiliaires",
                        "Alltagshilfe und Nebenleistungen"),
                lt(
                        "The domestic work that keeps a household running when illness or age makes it" + " difficult.",
                        "El trabajo doméstico que mantiene un hogar funcionando cuando la enfermedad o la edad"
                                + " lo dificultan.",
                        "Les tâches domestiques qui font tourner un foyer lorsque la maladie ou l'âge le"
                                + " rendent difficile.",
                        "Die Hausarbeit, die einen Haushalt am Laufen hält, wenn Krankheit oder Alter dies"
                                + " erschweren."),
                List.of(
                        lt(
                                "Cleaning, laundry and washing",
                                "Limpieza, lavandería y lavado",
                                "Ménage, buanderie et lessive",
                                "Reinigung, Wäsche und Waschen"),
                        lt(
                                "Meal planning and cooking",
                                "Planificación de comidas y cocina",
                                "Planification des repas et cuisine",
                                "Essensplanung und Kochen"),
                        lt(
                                "Grocery shopping and errands",
                                "Compras de supermercado y mandados",
                                "Courses et commissions",
                                "Einkaufen und Besorgungen"),
                        lt(
                                "Bill payments and household admin",
                                "Pago de facturas y administración del hogar",
                                "Paiement des factures et gestion administrative",
                                "Rechnungszahlung und Haushaltsverwaltung")),
                lt(
                        "Cleaning, washing and grocery on PEAR · all inclusive on MELON",
                        "Limpieza, lavado y compras en PEAR · todo incluido en MELON",
                        "Ménage, lessive et courses avec PEAR · tout inclus avec MELON",
                        "Reinigung, Wäsche und Einkauf bei PEAR · alles inklusive bei MELON"),
                6);
    }

    private CareService service(
            String slug,
            LocalizedText name,
            LocalizedText blurb,
            List<LocalizedText> points,
            LocalizedText availableOn,
            int displayOrder) {
        return new CareService(
                null,
                1,
                slug,
                name,
                blurb,
                points,
                availableOn,
                null,
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
