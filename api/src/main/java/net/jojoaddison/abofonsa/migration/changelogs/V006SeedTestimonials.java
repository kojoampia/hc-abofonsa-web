package net.jojoaddison.abofonsa.migration.changelogs;

import static net.jojoaddison.abofonsa.migration.changelogs.SeedText.lt;

import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.common.LocalizedText;
import net.jojoaddison.abofonsa.common.PublicationStatus;
import net.jojoaddison.abofonsa.content.TestimonialDocument;
import net.jojoaddison.abofonsa.content.TestimonialDocument.Consent;
import net.jojoaddison.abofonsa.migration.Changelog;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/**
 * Four testimonials transcribed from the {@code STORIES} array in
 * {@code Abofonsa_BridgeCare_Website.html}. {@code consent.obtained: true} is a <b>placeholder</b>
 * pending real consent evidence (spec §14.2 decision #3) — flagged again in plan.md's Phase 21
 * go-live checklist so this doesn't ship unedited.
 */
@Component
public class V006SeedTestimonials implements Changelog {

    @Override
    public String id() {
        return "V006_seed_testimonials";
    }

    @Override
    public void execute(MongoTemplate mongoTemplate) {
        mongoTemplate.insertAll(List.of(adwoaBoateng(), emmanuelOfori(), graceAsante(), drNaaAdjeleyQuartey()));
    }

    private TestimonialDocument adwoaBoateng() {
        return testimonial(
                lt(
                        "My mother refused to leave her house in Teshie, and honestly I had run out of ideas."
                                + " The nurse who visits her now knows her routine better than I do. I get the"
                                + " report on my phone the same afternoon — I have stopped lying awake about it.",
                        "Mi madre se negó a dejar su casa en Teshie, y sinceramente se me habían acabado las"
                                + " ideas. La enfermera que la visita ahora conoce su rutina mejor que yo."
                                + " Recibo el informe en mi teléfono esa misma tarde — he dejado de pasar la"
                                + " noche en vela por esto.",
                        "Ma mère a refusé de quitter sa maison à Teshie, et je dois avouer que je n'avais plus"
                                + " d'idées. L'infirmière qui lui rend visite maintenant connaît sa routine mieux"
                                + " que moi. Je reçois le rapport sur mon téléphone le jour même — je ne passe"
                                + " plus mes nuits à m'inquiéter.",
                        "Meine Mutter weigerte sich, ihr Haus in Teshie zu verlassen, und ehrlich gesagt wusste"
                                + " ich nicht mehr weiter. Die Pflegekraft, die sie jetzt besucht, kennt ihren"
                                + " Tagesablauf besser als ich. Ich erhalte den Bericht noch am selben"
                                + " Nachmittag auf mein Telefon — ich liege deswegen nicht mehr wach."),
                "Adwoa Boateng",
                lt(
                        "Daughter · Subscriber since 2025",
                        "Hija · Suscriptora desde 2025",
                        "Fille · Abonnée depuis 2025",
                        "Tochter · Abonnentin seit 2025"),
                lt("PAWPAW Plan", "Plan PAWPAW", "Forfait PAWPAW", "PAWPAW-Tarif"),
                1);
    }

    private TestimonialDocument emmanuelOfori() {
        return testimonial(
                lt(
                        "After my hip operation I was discharged on a Friday and genuinely did not know how I"
                                + " would cope. They had a nurse at my door on the Saturday morning. Six weeks"
                                + " later I am walking to church again.",
                        "Después de mi operación de cadera me dieron el alta un viernes y sinceramente no"
                                + " sabía cómo me las arreglaría. Tuvieron una enfermera en mi puerta el sábado"
                                + " por la mañana. Seis semanas después vuelvo a caminar a la iglesia.",
                        "Après mon opération de la hanche, je suis sorti un vendredi et je ne savais vraiment"
                                + " pas comment j'allais m'en sortir. Une infirmière était à ma porte dès le"
                                + " samedi matin. Six semaines plus tard, je marche de nouveau jusqu'à l'église.",
                        "Nach meiner Hüftoperation wurde ich an einem Freitag entlassen und wusste wirklich"
                                + " nicht, wie ich zurechtkommen sollte. Schon am Samstagmorgen stand eine"
                                + " Pflegekraft vor meiner Tür. Sechs Wochen später gehe ich wieder zu Fuß zur"
                                + " Kirche."),
                "Emmanuel Ofori",
                lt(
                        "Patient · Dansoman, Accra",
                        "Paciente · Dansoman, Accra",
                        "Patient · Dansoman, Accra",
                        "Patient · Dansoman, Accra"),
                lt("MELON Plan", "Plan MELON", "Forfait MELON", "MELON-Tarif"),
                2);
    }

    private TestimonialDocument graceAsante() {
        return testimonial(
                lt(
                        "What convinced me was the reporting. Every visit is written up properly — what was"
                                + " done, what her blood pressure was, what the nurse noticed. Nobody has to"
                                + " remember to tell me anything.",
                        "Lo que me convenció fue el sistema de informes. Cada visita se documenta"
                                + " adecuadamente — qué se hizo, cuál era su presión arterial, qué notó la"
                                + " enfermera. Nadie tiene que acordarse de contarme nada.",
                        "Ce qui m'a convaincue, c'est le compte-rendu. Chaque visite est consignée avec soin —"
                                + " ce qui a été fait, sa tension artérielle, ce que l'infirmière a remarqué."
                                + " Personne n'a besoin de penser à me tenir informée.",
                        "Überzeugt hat mich die Berichterstattung. Jeder Besuch wird ordentlich dokumentiert —"
                                + " was getan wurde, wie ihr Blutdruck war, was der Pflegekraft aufgefallen ist."
                                + " Niemand muss daran denken, mir etwas zu erzählen."),
                "Grace Asante",
                lt(
                        "Angel proxy for her aunt",
                        "Ángel apoderada de su tía",
                        "Ange désignée pour sa tante",
                        "Angel-Vertreterin für ihre Tante"),
                lt("PEAR Plan", "Plan PEAR", "Forfait PEAR", "PEAR-Tarif"),
                3);
    }

    private TestimonialDocument drNaaAdjeleyQuartey() {
        return testimonial(
                lt(
                        "I refer patients here when discharge planning is complicated. The handover is"
                                + " thorough and I receive the clinical notes without having to chase anyone,"
                                + " which is not something I can say of every provider.",
                        "Refiero pacientes aquí cuando la planificación del alta es complicada. El traspaso es"
                                + " minucioso y recibo las notas clínicas sin tener que perseguir a nadie, algo"
                                + " que no puedo decir de todos los proveedores.",
                        "J'oriente mes patients ici lorsque la sortie est complexe à organiser. La transmission"
                                + " est rigoureuse et je reçois les notes cliniques sans avoir à relancer"
                                + " personne, ce que je ne peux pas dire de tous les prestataires.",
                        "Ich überweise Patienten hierhin, wenn die Entlassungsplanung kompliziert ist. Die"
                                + " Übergabe ist gründlich, und ich erhalte die klinischen Notizen, ohne jemandem"
                                + " hinterherlaufen zu müssen — das kann ich nicht von jedem Anbieter sagen."),
                "Dr. Naa Adjeley Quartey",
                lt(
                        "Consultant Physician, Accra",
                        "Médica consultora, Accra",
                        "Médecin consultante, Accra",
                        "Fachärztin, Accra"),
                lt("Referring clinician", "Médica remitente", "Médecin prescripteur", "Überweisende Ärztin"),
                4);
    }

    private TestimonialDocument testimonial(
            LocalizedText quote,
            String personName,
            LocalizedText personRole,
            LocalizedText planLabel,
            int displayOrder) {
        return new TestimonialDocument(
                null,
                1,
                quote,
                personName,
                personRole,
                planLabel,
                5,
                null,
                new Consent(true, Instant.now(), "consent/seed/placeholder-" + displayOrder + ".pdf"),
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
