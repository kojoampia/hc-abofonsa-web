package net.jojoaddison.abofonsa.config.dbmigrations;

import static net.jojoaddison.abofonsa.config.dbmigrations.SeedText.lt;

import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.domain.Faq;
import net.jojoaddison.abofonsa.domain.LocalizedText;
import net.jojoaddison.abofonsa.domain.enumeration.FaqCategory;
import net.jojoaddison.abofonsa.domain.enumeration.PublicationStatus;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/** The seven FAQ entries, transcribed verbatim (English) from the {@code FAQS} array in
 * {@code Abofonsa_BridgeCare_Website.html}. */
@Component
public class V007SeedFaqs implements Changelog {

    @Override
    public String id() {
        return "V007_seed_faqs";
    }

    @Override
    public void execute(MongoTemplate mongoTemplate) {
        mongoTemplate.insertAll(List.of(
                faq(
                        1,
                        FaqCategory.COVERAGE,
                        lt(
                                "Which areas do you currently cover?",
                                "¿Qué zonas cubren actualmente?",
                                "Quelles zones couvrez-vous actuellement ?",
                                "Welche Gebiete decken Sie derzeit ab?"),
                        lt(
                                "We operate across Greater Accra, including Teshie, Nungua, East Legon, Osu,"
                                        + " Dansoman, Tema and the surrounding districts. Care outside this"
                                        + " region can often be arranged, but it is quoted separately and depends"
                                        + " on professional availability in that area.",
                                "Operamos en toda la región de Accra, incluyendo Teshie, Nungua, East Legon,"
                                        + " Osu, Dansoman, Tema y los distritos circundantes. La atención fuera"
                                        + " de esta región a menudo se puede organizar, pero se cotiza por"
                                        + " separado y depende de la disponibilidad de profesionales en esa zona.",
                                "Nous intervenons dans tout le Grand Accra, y compris à Teshie, Nungua, East"
                                        + " Legon, Osu, Dansoman, Tema et les districts environnants. Des soins"
                                        + " en dehors de cette région peuvent souvent être organisés, mais font"
                                        + " l'objet d'un devis séparé et dépendent de la disponibilité des"
                                        + " professionnels dans cette zone.",
                                "Wir sind in ganz Greater Accra tätig, einschließlich Teshie, Nungua, East Legon,"
                                        + " Osu, Dansoman, Tema und den umliegenden Bezirken. Pflege außerhalb"
                                        + " dieser Region kann oft organisiert werden, wird jedoch separat"
                                        + " kalkuliert und hängt von der Verfügbarkeit von Fachkräften in diesem"
                                        + " Gebiet ab.")),
                faq(
                        2,
                        FaqCategory.STAFF,
                        lt(
                                "Are your nurses and carers qualified?",
                                "¿Sus enfermeras y cuidadores están calificados?",
                                "Vos infirmiers et aidants sont-ils qualifiés ?",
                                "Sind Ihre Pflegekräfte und Betreuer qualifiziert?"),
                        lt(
                                "Yes. Registered nurses hold current licences with the Nursing and Midwifery"
                                        + " Council of Ghana, and physicians are registered with the Medical and"
                                        + " Dental Council. Every professional is background-checked,"
                                        + " reference-checked and works under the supervision of a senior"
                                        + " clinician who reviews their case notes.",
                                "Sí. Las enfermeras tituladas cuentan con licencias vigentes del Consejo de"
                                        + " Enfermería y Partería de Ghana, y los médicos están registrados en el"
                                        + " Consejo Médico y Dental. Cada profesional pasa una verificación de"
                                        + " antecedentes y referencias, y trabaja bajo la supervisión de un"
                                        + " clínico senior que revisa sus notas de caso.",
                                "Oui. Les infirmiers diplômés détiennent une licence en cours de validité auprès"
                                        + " du Nursing and Midwifery Council of Ghana, et les médecins sont"
                                        + " inscrits au Medical and Dental Council. Chaque professionnel fait"
                                        + " l'objet d'une vérification d'antécédents et de références, et"
                                        + " travaille sous la supervision d'un clinicien senior qui examine ses"
                                        + " dossiers.",
                                "Ja. Examinierte Pflegekräfte verfügen über eine gültige Zulassung des Nursing"
                                        + " and Midwifery Council of Ghana, und Ärzte sind beim Medical and Dental"
                                        + " Council registriert. Jede Fachkraft wird auf ihren Werdegang und ihre"
                                        + " Referenzen geprüft und arbeitet unter der Aufsicht einer leitenden"
                                        + " Fachkraft, die die Fallnotizen überprüft.")),
                faq(
                        3,
                        FaqCategory.CLINICAL,
                        lt(
                                "What is an \"Angel\" and do we have to nominate one?",
                                "¿Qué es un «Ángel» y tenemos que nominar uno?",
                                "Qu'est-ce qu'un « Ange » et devons-nous en désigner un ?",
                                "Was ist ein „Angel\" und müssen wir einen benennen?"),
                        lt(
                                "An Angel is the family member or trusted proxy who receives visit reports and"
                                        + " alerts on the patient's behalf. It is optional, but most families"
                                        + " nominate one — particularly where relatives live abroad. The patient"
                                        + " decides who it is and can change or withdraw that permission at any"
                                        + " time.",
                                "Un Ángel es el familiar o apoderado de confianza que recibe los informes de"
                                        + " visita y las alertas en nombre del paciente. Es opcional, pero la"
                                        + " mayoría de las familias nominan uno — particularmente cuando los"
                                        + " parientes viven en el extranjero. El paciente decide quién es y puede"
                                        + " cambiar o retirar ese permiso en cualquier momento.",
                                "Un Ange est le membre de la famille ou la personne de confiance désignée qui"
                                        + " reçoit les rapports de visite et les alertes au nom du patient. C'est"
                                        + " facultatif, mais la plupart des familles en désignent un —"
                                        + " particulièrement lorsque des proches vivent à l'étranger. Le patient"
                                        + " décide qui il sera et peut modifier ou retirer cette autorisation à"
                                        + " tout moment.",
                                "Ein Angel ist das Familienmitglied oder die Vertrauensperson, die im Namen des"
                                        + " Patienten Besuchsberichte und Warnmeldungen erhält. Dies ist optional,"
                                        + " aber die meisten Familien benennen eine Person — besonders wenn"
                                        + " Angehörige im Ausland leben. Der Patient entscheidet, wer dies ist,"
                                        + " und kann diese Berechtigung jederzeit ändern oder widerrufen.")),
                faq(
                        4,
                        FaqCategory.PLANS,
                        lt(
                                "Can we change or cancel a plan?",
                                "¿Podemos cambiar o cancelar un plan?",
                                "Pouvons-nous changer ou résilier un forfait ?",
                                "Können wir einen Tarif ändern oder kündigen?"),
                        lt(
                                "Plans can be upgraded at any time, and downgraded or cancelled with 30 days'"
                                        + " written notice. Where a patient is discharged from care or passes"
                                        + " away, we cancel immediately and refund any unused portion of the"
                                        + " month.",
                                "Los planes se pueden mejorar en cualquier momento, y reducir o cancelar con 30"
                                        + " días de preaviso por escrito. Cuando un paciente es dado de alta del"
                                        + " cuidado o fallece, cancelamos de inmediato y reembolsamos cualquier"
                                        + " parte no utilizada del mes.",
                                "Les forfaits peuvent être améliorés à tout moment, et réduits ou résiliés avec"
                                        + " un préavis écrit de 30 jours. Lorsqu'un patient sort du dispositif de"
                                        + " soins ou décède, nous résilions immédiatement et remboursons toute"
                                        + " partie inutilisée du mois.",
                                "Tarife können jederzeit hochgestuft und mit einer schriftlichen Kündigungsfrist"
                                        + " von 30 Tagen herabgestuft oder gekündigt werden. Wird ein Patient aus"
                                        + " der Pflege entlassen oder verstirbt er, kündigen wir sofort und"
                                        + " erstatten jeden nicht genutzten Teil des Monats.")),
                faq(
                        5,
                        FaqCategory.CLINICAL,
                        lt(
                                "What happens in an emergency?",
                                "¿Qué sucede en una emergencia?",
                                "Que se passe-t-il en cas d'urgence ?",
                                "Was passiert im Notfall?"),
                        lt(
                                "Escalation depends on severity. Minor changes notify your nominated Angel,"
                                        + " moderate concerns alert the assigned nurse, and critical events"
                                        + " dispatch local emergency services while the family is contacted. The"
                                        + " clinical on-call line is staffed continuously for subscribing"
                                        + " families.",
                                "El escalamiento depende de la gravedad. Los cambios menores notifican a su"
                                        + " Ángel nominado, las preocupaciones moderadas alertan a la enfermera"
                                        + " asignada, y los eventos críticos despachan los servicios de"
                                        + " emergencia locales mientras se contacta a la familia. La línea"
                                        + " clínica de guardia está atendida continuamente para las familias"
                                        + " suscriptoras.",
                                "L'escalade dépend de la gravité. Les changements mineurs préviennent votre Ange"
                                        + " désigné, les préoccupations modérées alertent l'infirmier assigné, et"
                                        + " les événements critiques déclenchent les services d'urgence locaux"
                                        + " pendant que la famille est contactée. La ligne clinique d'astreinte"
                                        + " est assurée en permanence pour les familles abonnées.",
                                "Die Eskalation richtet sich nach dem Schweregrad. Kleinere Veränderungen"
                                        + " benachrichtigen Ihren benannten Angel, moderate Bedenken alarmieren"
                                        + " die zuständige Pflegekraft, und kritische Ereignisse lösen den"
                                        + " lokalen Rettungsdienst aus, während die Familie kontaktiert wird. Die"
                                        + " klinische Bereitschaftsleitung ist für abonnierte Familien durchgehend"
                                        + " besetzt.")),
                faq(
                        6,
                        FaqCategory.BILLING,
                        lt(
                                "Is medication included in the price?",
                                "¿La medicación está incluida en el precio?",
                                "Les médicaments sont-ils inclus dans le prix ?",
                                "Sind Medikamente im Preis enthalten?"),
                        lt(
                                "No. Subscription prices cover professional time, coordination, monitoring and"
                                        + " reporting. Prescribed medication, consumables such as dressings, and"
                                        + " specialist equipment hire are billed separately at cost, and always"
                                        + " agreed with you in advance.",
                                "No. Los precios de suscripción cubren el tiempo profesional, la coordinación,"
                                        + " el monitoreo y los informes. La medicación recetada, los consumibles"
                                        + " como los vendajes y el alquiler de equipo especializado se facturan"
                                        + " por separado a precio de costo, y siempre se acuerdan con usted de"
                                        + " antemano.",
                                "Non. Les prix d'abonnement couvrent le temps professionnel, la coordination, la"
                                        + " surveillance et le compte-rendu. Les médicaments prescrits, les"
                                        + " consommables tels que les pansements et la location d'équipement"
                                        + " spécialisé sont facturés séparément au prix coûtant, et toujours"
                                        + " convenus avec vous à l'avance.",
                                "Nein. Die Abonnementpreise decken den fachlichen Zeitaufwand, die Koordination,"
                                        + " die Überwachung und die Berichterstattung ab. Verschriebene"
                                        + " Medikamente, Verbrauchsmaterial wie Verbände und die Anmietung von"
                                        + " Spezialausrüstung werden separat zum Selbstkostenpreis abgerechnet"
                                        + " und stets vorab mit Ihnen vereinbart.")),
                faq(
                        7,
                        FaqCategory.CLINICAL,
                        lt(
                                "Do you work alongside our existing doctor?",
                                "¿Trabajan junto a nuestro médico actual?",
                                "Travaillez-vous avec notre médecin actuel ?",
                                "Arbeiten Sie mit unserem bestehenden Arzt zusammen?"),
                        lt(
                                "Ordinarily, yes. Most families prefer us to coordinate with the physician who"
                                        + " already knows the patient, and we will share visit notes and"
                                        + " observations with them on request. Where a plan includes doctor"
                                        + " review, that clinician works with your existing care team rather than"
                                        + " replacing it.",
                                "Normalmente, sí. La mayoría de las familias prefieren que coordinemos con el"
                                        + " médico que ya conoce al paciente, y compartiremos las notas de visita"
                                        + " y observaciones con ellos a petición. Cuando un plan incluye revisión"
                                        + " médica, ese clínico trabaja con su equipo de atención existente en"
                                        + " lugar de reemplazarlo.",
                                "Généralement, oui. La plupart des familles préfèrent que nous coordonnions avec"
                                        + " le médecin qui connaît déjà le patient, et nous partagerons les notes"
                                        + " de visite et observations avec lui sur demande. Lorsqu'un forfait"
                                        + " inclut un suivi médical, ce clinicien travaille avec votre équipe de"
                                        + " soins existante plutôt que de la remplacer.",
                                "In der Regel ja. Die meisten Familien möchten, dass wir uns mit dem Arzt"
                                        + " abstimmen, der den Patienten bereits kennt, und wir teilen Besuchsnotizen"
                                        + " und Beobachtungen auf Wunsch mit ihm. Wenn ein Tarif eine ärztliche"
                                        + " Kontrolle beinhaltet, arbeitet diese Fachkraft mit Ihrem bestehenden"
                                        + " Behandlungsteam zusammen, anstatt es zu ersetzen."))));
    }

    private Faq faq(int displayOrder, FaqCategory category, LocalizedText question, LocalizedText answer) {
        return new Faq(
                null,
                1,
                question,
                answer,
                category,
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
