package net.jojoaddison.abofonsa.migration.changelogs;

import static net.jojoaddison.abofonsa.migration.changelogs.SeedText.lt;

import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.common.PublicationStatus;
import net.jojoaddison.abofonsa.content.SectionDocument;
import net.jojoaddison.abofonsa.content.SectionDocument.Item;
import net.jojoaddison.abofonsa.content.SectionDocument.SectionKey;
import net.jojoaddison.abofonsa.migration.Changelog;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/**
 * Hero, assurance, process, approach, stats, angel, cta — all seven fixed-layout sections,
 * transcribed verbatim (English) from {@code Abofonsa_BridgeCare_Website.html} per spec Appendix
 * B's prototype-element mapping.
 */
@Component
public class V003SeedSections implements Changelog {

    @Override
    public String id() {
        return "V003_seed_sections";
    }

    @Override
    public void execute(MongoTemplate mongoTemplate) {
        mongoTemplate.insertAll(List.of(hero(), assurance(), process(), approach(), stats(), angel(), cta()));
    }

    private SectionDocument hero() {
        var items = List.of(
                new Item(
                        "stat-fulfilment",
                        "shield",
                        lt("99%", "99 %", "99 %", "99 %"),
                        lt("Shift fulfilment", "Turnos cubiertos", "Taux de couverture", "Schichtabdeckung")),
                new Item(
                        "stat-monitored",
                        "clock",
                        lt("24/7", "24/7", "24 h/24", "24/7"),
                        lt("Monitored care", "Atención supervisada", "Soins supervisés", "Betreute Pflege")),
                new Item(
                        "stat-days",
                        "calendar",
                        lt("365", "365", "365", "365"),
                        lt("Days a year", "Días al año", "Jours par an", "Tage im Jahr")),
                new Item(
                        "stat-region",
                        "map-pin",
                        lt("Accra", "Accra", "Accra", "Accra"),
                        lt("& Greater Region", "y Gran Accra", "et sa région", "und Umgebung")),
                new Item(
                        "badge-vetted",
                        "badge-check",
                        lt(
                                "Vetted professionals",
                                "Profesionales verificados",
                                "Professionnels vérifiés",
                                "Geprüfte Fachkräfte"),
                        lt("", "", "", "")));
        return section(
                SectionKey.HERO,
                lt(
                        "Providing peace of mind across borders",
                        "Proporcionando tranquilidad más allá de las fronteras",
                        "Offrant la tranquillité d'esprit au-delà des frontières",
                        "Sorgenfreiheit über Grenzen hinweg"),
                lt(
                        "Hospital-grade care, delivered to the door.",
                        "Atención de nivel hospitalario, en su propio hogar.",
                        "Des soins de niveau hospitalier, livrés à votre porte.",
                        "Pflege auf Krankenhausniveau, direkt an Ihrer Tür."),
                lt(
                        "Abofonsa means \"Angelic Hands\".",
                        "Abofonsa significa «Manos Angelicales».",
                        "Abofonsa signifie « Mains Angéliques ».",
                        "Abofonsa bedeutet „Engelshände\"."),
                lt(
                        "Abofonsa BridgeCare Health Connect brings scheduled nursing, doctor review and daily"
                                + " living support into the home — coordinated by a professional team and"
                                + " monitored around the clock, so families never have to wonder how their loved"
                                + " one is doing.",
                        "Abofonsa BridgeCare Health Connect lleva enfermería programada, revisión médica y"
                                + " apoyo en las actividades diarias al hogar — coordinado por un equipo"
                                + " profesional y supervisado las 24 horas, para que las familias nunca tengan"
                                + " que preguntarse cómo está su ser querido.",
                        "Abofonsa BridgeCare Health Connect apporte au domicile des soins infirmiers"
                                + " programmés, un suivi médical et une aide à la vie quotidienne — coordonnés"
                                + " par une équipe professionnelle et surveillés en permanence, afin que les"
                                + " familles n'aient plus jamais à s'inquiéter du bien-être de leur proche.",
                        "Abofonsa BridgeCare Health Connect bringt geplante Pflege, ärztliche Kontrolle und"
                                + " Alltagsunterstützung direkt nach Hause — koordiniert von einem professionellen"
                                + " Team und rund um die Uhr überwacht, damit sich Familien nie fragen müssen, wie"
                                + " es ihrem Angehörigen geht."),
                items);
    }

    private SectionDocument assurance() {
        var items = List.of(
                new Item(
                        "assurance-vetted",
                        "shield-check",
                        lt(
                                "Vetted professionals",
                                "Profesionales verificados",
                                "Professionnels vérifiés",
                                "Geprüfte Fachkräfte"),
                        lt(
                                "Background-checked nurses, carers and physicians",
                                "Enfermeras, cuidadores y médicos con antecedentes verificados",
                                "Infirmiers, aidants et médecins vérifiés",
                                "Geprüfte Pflegekräfte, Betreuer und Ärzte")),
                new Item(
                        "assurance-fulfilment",
                        "check-circle",
                        lt(
                                "99% shift fulfilment",
                                "99 % de turnos cubiertos", "99 % de couverture des visites", "99 % Schichtabdeckung"),
                        lt(
                                "Cover is arranged before a visit is ever missed",
                                "Se organiza la cobertura antes de que se pierda una visita",
                                "La couverture est organisée avant qu'une visite ne soit manquée",
                                "Vertretung wird organisiert, bevor ein Besuch ausfällt")),
                new Item(
                        "assurance-telemetry",
                        "activity",
                        lt("24/7 telemetry", "Telemetría 24/7", "Télésurveillance 24 h/24", "24/7 Telemetrie"),
                        lt(
                                "Vital signs monitored continuously between visits",
                                "Signos vitales monitoreados continuamente entre visitas",
                                "Signes vitaux surveillés en continu entre les visites",
                                "Vitalwerte werden zwischen den Besuchen kontinuierlich überwacht")),
                new Item(
                        "assurance-reporting",
                        "file-text",
                        lt(
                                "Reporting after every visit",
                                "Informe después de cada visita",
                                "Rapport après chaque visite",
                                "Bericht nach jedem Besuch"),
                        lt(
                                "A written record the family can always see",
                                "Un registro escrito que la familia siempre puede ver",
                                "Un compte-rendu écrit toujours accessible à la famille",
                                "Ein schriftlicher Bericht, den die Familie jederzeit einsehen kann")));
        return section(
                SectionKey.ASSURANCE,
                LocalizedTextEmpty(),
                LocalizedTextEmpty(),
                LocalizedTextEmpty(),
                LocalizedTextEmpty(),
                items);
    }

    private SectionDocument process() {
        var items = List.of(
                new Item(
                        "process-consultation",
                        "phone",
                        lt("Consultation", "Consulta", "Consultation", "Beratung"),
                        lt(
                                "We talk through the situation by phone or at home — conditions, routines, and"
                                        + " what the family needs most.",
                                "Hablamos sobre la situación por teléfono o en casa — condiciones, rutinas y lo"
                                        + " que la familia más necesita.",
                                "Nous discutons de la situation par téléphone ou à domicile — pathologies,"
                                        + " routines et besoins prioritaires de la famille.",
                                "Wir besprechen die Situation telefonisch oder zu Hause — Erkrankungen,"
                                        + " Tagesabläufe und die dringendsten Bedürfnisse der Familie.")),
                new Item(
                        "process-assessment",
                        "clipboard-check",
                        lt("Clinical assessment", "Evaluación clínica", "Évaluation clinique", "Klinische Beurteilung"),
                        lt(
                                "A registered nurse visits, reviews medical history and medication, and"
                                        + " documents a baseline.",
                                "Una enfermera titulada visita, revisa el historial médico y la medicación, y"
                                        + " documenta una línea base.",
                                "Un infirmier diplômé se rend sur place, examine les antécédents médicaux et les"
                                        + " traitements, et établit un bilan de référence.",
                                "Eine examinierte Pflegekraft besucht Sie, prüft Vorgeschichte und Medikation und"
                                        + " dokumentiert einen Ausgangsbefund.")),
                new Item(
                        "process-plan",
                        "file-text",
                        lt("Your care plan", "Su plan de cuidado", "Votre plan de soins", "Ihr Pflegeplan"),
                        lt(
                                "You receive a written daily service plan with visit times, named professionals"
                                        + " and agreed costs.",
                                "Recibe un plan de servicio diario por escrito con horarios de visita,"
                                        + " profesionales asignados y costos acordados.",
                                "Vous recevez un plan de service quotidien écrit précisant les horaires de"
                                        + " visite, les professionnels nommés et les coûts convenus.",
                                "Sie erhalten einen schriftlichen Tagespflegeplan mit Besuchszeiten, benannten"
                                        + " Fachkräften und vereinbarten Kosten.")),
                new Item(
                        "process-begins",
                        "heart",
                        lt("Care begins", "El cuidado comienza", "Les soins commencent", "Die Pflege beginnt"),
                        lt(
                                "Visits start on schedule. You receive a report after each one and can adjust"
                                        + " the plan at any time.",
                                "Las visitas comienzan según lo programado. Recibe un informe después de cada"
                                        + " una y puede ajustar el plan en cualquier momento.",
                                "Les visites commencent comme prévu. Vous recevez un rapport après chacune"
                                        + " d'elles et pouvez ajuster le plan à tout moment.",
                                "Die Besuche beginnen planmäßig. Sie erhalten nach jedem Besuch einen Bericht"
                                        + " und können den Plan jederzeit anpassen.")));
        return section(
                SectionKey.PROCESS,
                lt("The process", "El proceso", "Le processus", "Der Ablauf"),
                lt(
                        "Getting started takes about a week",
                        "Empezar toma aproximadamente una semana",
                        "La mise en route prend environ une semaine",
                        "Der Einstieg dauert etwa eine Woche"),
                LocalizedTextEmpty(),
                LocalizedTextEmpty(),
                items);
    }

    private SectionDocument approach() {
        var items = List.of(
                new Item(
                        "approach-scheduling",
                        "calendar-check",
                        lt(
                                "Scheduling that holds",
                                "Programación que se cumple",
                                "Une planification fiable",
                                "Verlässliche Planung"),
                        lt(
                                "If a professional is unavailable, cover is arranged and reassigned before the"
                                        + " visit is missed — which is how we sustain 99% shift fulfilment.",
                                "Si un profesional no está disponible, se organiza y reasigna la cobertura antes"
                                        + " de que se pierda la visita — así es como mantenemos el 99% de turnos"
                                        + " cubiertos.",
                                "Si un professionnel est indisponible, une solution de remplacement est"
                                        + " organisée avant que la visite ne soit manquée — c'est ainsi que nous"
                                        + " maintenons 99 % de couverture des visites.",
                                "Ist eine Fachkraft nicht verfügbar, wird Ersatz organisiert, bevor der Besuch"
                                        + " ausfällt — so erreichen wir eine Schichtabdeckung von 99 %.")),
                new Item(
                        "approach-monitoring",
                        "activity",
                        lt(
                                "Monitoring between visits",
                                "Monitoreo entre visitas",
                                "Surveillance entre les visites",
                                "Überwachung zwischen den Besuchen"),
                        lt(
                                "Connected devices record vital signs continuously. Readings outside the"
                                        + " boundaries your clinician sets raise an alert rather than waiting for"
                                        + " the next visit.",
                                "Los dispositivos conectados registran los signos vitales continuamente. Las"
                                        + " lecturas fuera de los límites establecidos por su médico generan una"
                                        + " alerta en lugar de esperar a la próxima visita.",
                                "Des appareils connectés enregistrent en continu les signes vitaux. Toute mesure"
                                        + " hors des limites fixées par votre médecin déclenche une alerte plutôt"
                                        + " que d'attendre la prochaine visite.",
                                "Vernetzte Geräte erfassen kontinuierlich die Vitalwerte. Messwerte außerhalb der"
                                        + " von Ihrem Arzt festgelegten Grenzen lösen sofort einen Alarm aus, statt"
                                        + " auf den nächsten Besuch zu warten.")),
                new Item(
                        "approach-escalation",
                        "alert-triangle",
                        lt(
                                "Escalation that matches severity",
                                "Escalamiento según la gravedad",
                                "Une escalade proportionnée à la gravité",
                                "Eskalation je nach Schweregrad"),
                        lt(
                                "Minor changes notify your nominated family contact, moderate concerns alert the"
                                        + " assigned nurse, and critical events dispatch emergency services"
                                        + " directly.",
                                "Los cambios menores notifican a su contacto familiar designado, las"
                                        + " preocupaciones moderadas alertan a la enfermera asignada y los eventos"
                                        + " críticos despachan los servicios de emergencia directamente.",
                                "Les changements mineurs préviennent votre contact familial désigné, les"
                                        + " préoccupations modérées alertent l'infirmier assigné, et les"
                                        + " événements critiques déclenchent directement les services d'urgence.",
                                "Kleinere Veränderungen benachrichtigen Ihren benannten Familienkontakt,"
                                        + " moderate Bedenken alarmieren die zuständige Pflegekraft, und kritische"
                                        + " Ereignisse lösen direkt den Rettungsdienst aus.")));
        return section(
                SectionKey.APPROACH,
                lt("Our approach", "Nuestro enfoque", "Notre approche", "Unser Ansatz"),
                lt(
                        "Care that is coordinated, not improvised",
                        "Cuidado coordinado, no improvisado",
                        "Des soins coordonnés, jamais improvisés",
                        "Koordinierte statt improvisierte Pflege"),
                LocalizedTextEmpty(),
                LocalizedTextEmpty(),
                items);
    }

    private SectionDocument stats() {
        var items = List.of(
                new Item(
                        "stats-fulfilment",
                        "check-circle",
                        lt("99%", "99 %", "99 %", "99 %"),
                        lt(
                                "Shift fulfilment rate",
                                "Tasa de turnos cubiertos",
                                "Taux de couverture des visites",
                                "Schichtabdeckungsquote")),
                new Item(
                        "stats-telemetry",
                        "activity",
                        lt("24/7", "24/7", "24 h/24", "24/7"),
                        lt(
                                "Telemetry monitoring",
                                "Monitoreo por telemetría",
                                "Télésurveillance",
                                "Telemetrie-Überwachung")),
                new Item(
                        "stats-days",
                        "calendar",
                        lt("365", "365", "365", "365"),
                        lt(
                                "Days of service a year",
                                "Días de servicio al año",
                                "Jours de service par an",
                                "Tage im Jahr im Einsatz")),
                new Item(
                        "stats-tiers",
                        "layers",
                        lt("3", "3", "3", "3"),
                        lt(
                                "Subscription tiers",
                                "Niveles de suscripción",
                                "Niveaux d'abonnement",
                                "Abonnementstufen")));
        return section(
                SectionKey.STATS,
                LocalizedTextEmpty(),
                LocalizedTextEmpty(),
                LocalizedTextEmpty(),
                LocalizedTextEmpty(),
                items);
    }

    private SectionDocument angel() {
        var items = List.of(
                new Item(
                        "angel-reporting",
                        "file-text",
                        lt(
                                "A report after every visit",
                                "Un informe después de cada visita",
                                "Un rapport après chaque visite",
                                "Ein Bericht nach jedem Besuch"),
                        lt(
                                "Vital signs, tasks completed, medication administered and the carer's own"
                                        + " notes — countersigned by the supervising nurse.",
                                "Signos vitales, tareas completadas, medicación administrada y notas propias"
                                        + " del cuidador — refrendadas por la enfermera supervisora.",
                                "Signes vitaux, tâches accomplies, médicaments administrés et notes de l'aidant"
                                        + " — contresignés par l'infirmier superviseur.",
                                "Vitalwerte, erledigte Aufgaben, verabreichte Medikamente und die eigenen"
                                        + " Notizen der Pflegekraft — gegengezeichnet von der aufsichtführenden"
                                        + " Pflegefachkraft.")),
                new Item(
                        "angel-directline",
                        "phone-call",
                        lt(
                                "A direct line to the care team",
                                "Una línea directa con el equipo de atención",
                                "Une ligne directe avec l'équipe de soins",
                                "Eine direkte Verbindung zum Pflegeteam"),
                        lt(
                                "Message the assigned nurse or call the coordination desk without going through"
                                        + " a switchboard.",
                                "Envíe un mensaje a la enfermera asignada o llame a la central de coordinación"
                                        + " sin pasar por una centralita.",
                                "Envoyez un message à l'infirmier assigné ou appelez le bureau de coordination"
                                        + " sans passer par un standard.",
                                "Schreiben Sie der zuständigen Pflegekraft oder rufen Sie die Koordinationsstelle"
                                        + " direkt an, ohne über eine Zentrale zu gehen.")));
        return section(
                SectionKey.ANGEL,
                lt("The Angel network", "La red de Ángeles", "Le réseau des Anges", "Das Angel-Netzwerk"),
                lt(
                        "Someone is always accountable",
                        "Siempre hay alguien responsable",
                        "Quelqu'un est toujours responsable",
                        "Jemand ist immer verantwortlich"),
                LocalizedTextEmpty(),
                LocalizedTextEmpty(),
                items);
    }

    private SectionDocument cta() {
        return section(
                SectionKey.CTA,
                LocalizedTextEmpty(),
                lt(
                        "Discuss your family's needs with a nurse",
                        "Hable con una enfermera sobre las necesidades de su familia",
                        "Parlez des besoins de votre famille avec un infirmier",
                        "Besprechen Sie die Bedürfnisse Ihrer Familie mit einer Pflegekraft"),
                LocalizedTextEmpty(),
                lt(
                        "A consultation is free and carries no obligation. We will tell you honestly whether"
                                + " home care is the right option for your situation.",
                        "Una consulta es gratuita y sin compromiso. Le diremos honestamente si el cuidado en"
                                + " casa es la opción adecuada para su situación.",
                        "Une consultation est gratuite et sans engagement. Nous vous dirons honnêtement si les"
                                + " soins à domicile conviennent à votre situation.",
                        "Eine Beratung ist kostenlos und unverbindlich. Wir sagen Ihnen ehrlich, ob häusliche"
                                + " Pflege die richtige Option für Ihre Situation ist."),
                List.of());
    }

    private static net.jojoaddison.abofonsa.common.LocalizedText LocalizedTextEmpty() {
        return net.jojoaddison.abofonsa.common.LocalizedText.empty();
    }

    private SectionDocument section(
            SectionKey key,
            net.jojoaddison.abofonsa.common.LocalizedText eyebrow,
            net.jojoaddison.abofonsa.common.LocalizedText heading,
            net.jojoaddison.abofonsa.common.LocalizedText subheading,
            net.jojoaddison.abofonsa.common.LocalizedText body,
            List<Item> items) {
        return new SectionDocument(
                null,
                1,
                key,
                eyebrow,
                heading,
                subheading,
                body,
                items,
                null,
                PublicationStatus.PUBLISHED,
                null,
                Instant.now(),
                Instant.now(),
                "usr_admin",
                "usr_admin",
                null);
    }
}
