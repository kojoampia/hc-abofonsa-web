package net.jojoaddison.abofonsa.config.dbmigrations;

import static net.jojoaddison.abofonsa.config.dbmigrations.SeedText.en;

import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.domain.CareerTrack;
import net.jojoaddison.abofonsa.domain.LocalizedText;
import net.jojoaddison.abofonsa.domain.enumeration.AuthorityRole;
import net.jojoaddison.abofonsa.domain.enumeration.PublicationStatus;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/**
 * The six recruited tracks (careers-plan.md D-2).
 *
 * <p>{@code openings} is the honest part. Nurses, carers and doctors are staffed roles — every plan
 * tier is built on the first two and the PAWPAW/MELON tiers sell doctor review. Paramedics,
 * pharmacists and therapists appear nowhere in the current service or plan content, so they seed
 * with {@code openings: false}: the track is real and applications are welcome, but there is no
 * rota yet and the page must not imply one. Flip the flag in the CMS the day a rota exists.
 *
 * <p>Requirements name the actual Ghanaian regulators, because a vague "relevant registration"
 * helps nobody and this list is the only thing standing between a curious visitor and the
 * credentialing reviewer's queue (D-1).
 */
@Component
public class V012SeedCareerTracks implements Changelog {

    /** Step 6 of the onboarding workflow asks every applicant for these, whatever their track.
     * Stated here so an applicant arrives with them and is not returned for correction. */
    private static List<LocalizedText> commonDocuments() {
        return List.of(
                en("A clear photograph of yourself"),
                en("Ghana Card or passport"),
                en("Your professional qualification certificate"),
                en("Your current practising licence, showing its expiry date"));
    }

    @Override
    public String id() {
        return "V012_seed_career_tracks";
    }

    @Override
    public void execute(MongoTemplate mongoTemplate) {
        mongoTemplate.insertAll(List.of(
                track(
                        "registered-nurse",
                        AuthorityRole.ROLE_NURSE,
                        true,
                        1,
                        "Registered nurse",
                        "Clinical visits in patients' homes — observations, wound care, medication, and the"
                                + " written report the family reads afterwards. You work to a schedule, not a"
                                + " queue, and a senior clinician countersigns your notes.",
                        List.of(
                                "Current licence with the Nursing and Midwifery Council of Ghana",
                                "At least two years of post-registration practice",
                                "Comfortable working alone in a patient's home, with clinical support a call away",
                                "Able to travel across Greater Accra")),
                track(
                        "care-assistant",
                        AuthorityRole.ROLE_CARER,
                        true,
                        2,
                        "Care assistant",
                        "Daily living support that keeps someone in their own home — washing and dressing,"
                                + " meals, medication reminders, and company. You are often the person who"
                                + " notices first when something has changed.",
                        List.of(
                                "Recognised care or health-assistant training, or equivalent experience",
                                "References covering at least one year of care work",
                                "Patience, discretion, and a genuine liking for older people",
                                "Able to travel across Greater Accra")),
                track(
                        "visiting-physician",
                        AuthorityRole.ROLE_DOCTOR,
                        true,
                        3,
                        "Visiting physician",
                        "Scheduled review for patients on the PAWPAW and MELON plans, alongside the family's"
                                + " own doctor rather than in place of them. Sessional, fitted around an"
                                + " existing practice.",
                        List.of(
                                "Full registration with the Medical and Dental Council of Ghana",
                                "Experience in family, internal, or geriatric medicine",
                                "Willing to work with a patient's existing physician and share visit notes",
                                "Available for scheduled sessions rather than on-demand cover")),
                track(
                        "paramedic",
                        AuthorityRole.ROLE_PARAMEDIC,
                        false,
                        4,
                        "Paramedic",
                        "We are building this team. Emergency response and escalation for subscribing"
                                + " families is currently handled through local services, and we are talking to"
                                + " paramedics about what an in-house rota should look like.",
                        List.of(
                                "Current registration as a paramedic or emergency medical technician in Ghana",
                                "Pre-hospital emergency experience",
                                "Interested in shaping a service that does not exist yet")),
                track(
                        "pharmacist",
                        AuthorityRole.ROLE_PHARMACIST,
                        false,
                        5,
                        "Pharmacist",
                        "We are building this team. Medication reconciliation across several prescribers is"
                                + " one of the harder parts of home care, and we want a pharmacist's judgement"
                                + " in it before we offer it as a service.",
                        List.of(
                                "Current registration with the Pharmacy Council of Ghana",
                                "Experience reviewing medication for patients with several prescribers",
                                "Interested in shaping a service that does not exist yet")),
                track(
                        "therapist",
                        AuthorityRole.ROLE_THERAPIST,
                        false,
                        6,
                        "Physiotherapist or occupational therapist",
                        "We are building this team. Rehabilitation after a hospital stay is part of the"
                                + " hospital-to-home service, and we are recruiting ahead of a dedicated"
                                + " therapy rota.",
                        List.of(
                                "Current registration with the Allied Health Professions Council of Ghana",
                                "Experience in rehabilitation or home-based therapy",
                                "Interested in shaping a service that does not exist yet"))));
    }

    private CareerTrack track(
            String slug,
            AuthorityRole authorityRole,
            boolean openings,
            int displayOrder,
            String title,
            String blurb,
            List<String> requirements) {
        var now = Instant.now();
        return new CareerTrack(
                null,
                1,
                slug,
                en(title),
                en(blurb),
                requirements.stream().map(SeedText::en).toList(),
                commonDocuments(),
                authorityRole,
                openings,
                displayOrder,
                PublicationStatus.PUBLISHED,
                null,
                now,
                now,
                "system",
                "system",
                null);
    }
}
