package net.jojoaddison.abofonsa.config.dbmigrations;

import static net.jojoaddison.abofonsa.config.dbmigrations.SeedText.lt;

import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.domain.SiteSettings;
import net.jojoaddison.abofonsa.domain.SiteSettings.Address;
import net.jojoaddison.abofonsa.domain.SiteSettings.Seo;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.stereotype.Component;

/**
 * Contact details, hours and SEO defaults (spec §8.5/Appendix B), transcribed verbatim from
 * {@code Abofonsa_BridgeCare_Website.html}'s top strip, footer and {@code <title>}/
 * {@code <meta name="description">}.
 */
@Component
public class V002SeedSiteSettings implements Changelog {

    @Override
    public String id() {
        return "V002_seed_site_settings";
    }

    @Override
    public void execute(MongoTemplate mongoTemplate) {
        var settings = new SiteSettings(
                null,
                1,
                SiteSettings.SINGLETON_VALUE,
                "Abofonsa BridgeCare",
                lt(
                        "Providing peace of mind across borders",
                        "Proporcionando tranquilidad más allá de las fronteras",
                        "Offrant la tranquillité d'esprit au-delà des frontières",
                        "Sorgenfreiheit über Grenzen hinweg"),
                List.of("+233 302 717 577", "+233 502 588 736"),
                "+233 242 286 304",
                "info@abofonsa.com",
                "https://www.abofonsa.com",
                // Null on purpose: enrolment is self-service (careers-plan.md D-1) and
                // /request-invitation does not exist on professional.abofonsa.com yet. An editor
                // sets this the day it does, and the secondary call-to-action appears.
                null,
                new Address(
                        "Ankobra River Street #5",
                        "Teshie Nungua Estates",
                        "Accra",
                        "Ghana",
                        new GeoJsonPoint(-0.1077, 5.5820)),
                lt(
                        "Monday–Saturday, 07:00–19:00 GMT",
                        "Lunes a sábado, 07:00–19:00 GMT",
                        "Du lundi au samedi, 07 h 00 à 19 h 00 GMT",
                        "Montag bis Samstag, 07:00–19:00 GMT"),
                lt(
                        "24 hours, every day",
                        "24 horas, todos los días",
                        "24 heures sur 24, tous les jours",
                        "24 Stunden, jeden Tag"),
                List.of(),
                new Seo(
                        lt(
                                "Abofonsa BridgeCare — Professional Home Healthcare in Ghana",
                                "Abofonsa BridgeCare — Atención médica domiciliaria profesional en Ghana",
                                "Abofonsa BridgeCare — Soins de santé à domicile professionnels au Ghana",
                                "Abofonsa BridgeCare — Professionelle häusliche Gesundheitsversorgung in Ghana"),
                        lt(
                                "Abofonsa BridgeCare Health Connect delivers scheduled, professionally supervised"
                                        + " healthcare to the patient's doorstep across Greater Accra. Nursing"
                                        + " visits, doctor review, telemetry monitoring and daily living support.",
                                "Abofonsa BridgeCare Health Connect ofrece atención médica programada y supervisada"
                                        + " profesionalmente en la puerta del paciente en toda la región de Accra."
                                        + " Visitas de enfermería, revisión médica, monitoreo por telemetría y apoyo"
                                        + " en las actividades diarias.",
                                "Abofonsa BridgeCare Health Connect propose des soins de santé programmés et"
                                        + " supervisés par des professionnels, directement au domicile du patient"
                                        + " dans le Grand Accra. Visites infirmières, suivi médical, télésurveillance"
                                        + " et aide à la vie quotidienne.",
                                "Abofonsa BridgeCare Health Connect bietet geplante, professionell überwachte"
                                        + " Gesundheitsversorgung direkt vor der Haustür der Patienten in Greater"
                                        + " Accra. Pflegebesuche, ärztliche Kontrolle, Telemetrie-Überwachung und"
                                        + " Unterstützung im Alltag."),
                        null),
                Instant.now(),
                "usr_admin");

        mongoTemplate.insert(settings);
    }
}
