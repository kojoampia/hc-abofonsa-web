package net.jojoaddison.abofonsa.config.dbmigrations;

import static net.jojoaddison.abofonsa.config.dbmigrations.SeedText.en;

import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.domain.Section;
import net.jojoaddison.abofonsa.domain.enumeration.PublicationStatus;
import net.jojoaddison.abofonsa.domain.enumeration.SectionKey;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/**
 * The four careers-page sections (careers-plan.md §4). Copy is deliberately conservative: D-3
 * (terms) and D-4 (review turnaround) are still open, so nothing here promises pay, employment
 * status, or a response time. The process section describes the *stages* of
 * {@code professional-onboarding-workflow.md}'s status model instead, which is honest and still
 * tells a candidate what to expect.
 */
@Component
public class V013SeedCareerSections implements Changelog {

    @Override
    public String id() {
        return "V013_seed_career_sections";
    }

    @Override
    public void execute(MongoTemplate mongoTemplate) {
        mongoTemplate.insertAll(List.of(
                section(
                        SectionKey.CAREERS_HERO,
                        "Work with us",
                        "Clinical work, properly organised.",
                        "Scheduled visits, named supervision, and a written record of everything you do.",
                        "Abofonsa BridgeCare brings nursing, doctor review and daily living support into"
                                + " people's homes across Greater Accra. Families are often abroad, so the"
                                + " quality of what you record matters as much as the visit itself — and you are"
                                + " never the only person accountable for a patient.",
                        List.of()),
                section(
                        SectionKey.CAREERS_LIFE,
                        "What the work is like",
                        "Coordinated, not improvised",
                        "The difference between this and agency work is the infrastructure behind you.",
                        null,
                        List.of(
                                item(
                                        "supervision",
                                        "shield",
                                        "You are supervised, not alone",
                                        "A senior clinician reviews your case notes and is reachable while you are"
                                                + " in someone's home. Escalation is a defined path, not a"
                                                + " judgement call you make by yourself."),
                                item(
                                        "schedule",
                                        "calendar",
                                        "A rota, not a scramble",
                                        "Visits are scheduled and cover is arranged before a visit is missed."
                                                + " You know your week."),
                                item(
                                        "record",
                                        "activity",
                                        "Your work is written down",
                                        "Every visit produces a report the family reads. Good work is visible"
                                                + " rather than assumed."),
                                item(
                                        "equipment",
                                        "heart",
                                        "Monitoring that supports you",
                                        "Vital signs are tracked between visits, so you arrive knowing what has"
                                                + " changed since you were last there."))),
                section(
                        SectionKey.CAREERS_PROCESS,
                        "How joining works",
                        "What happens after you apply",
                        "Four stages. You can see where you are at each one.",
                        null,
                        List.of(
                                item(
                                        "account",
                                        "phone",
                                        "1. Create your account",
                                        "You register, confirm your email, and set a password. This takes a few"
                                                + " minutes."),
                                item(
                                        "profile",
                                        "layers",
                                        "2. Complete your profile",
                                        "Your details, address, next of kin, and your documents. You can save and"
                                                + " come back — it does not have to be done in one sitting."),
                                item(
                                        "review",
                                        "shield",
                                        "3. We verify your credentials",
                                        "We check your licence and qualifications with the issuing body. If"
                                                + " something is missing or unclear we will ask you for it — that is a"
                                                + " normal step, not a rejection."),
                                item(
                                        "start",
                                        "clock",
                                        "4. Your access is opened",
                                        "Once approved you are assigned your clinical role and added to a rota, and"
                                                + " your dashboard opens."))),
                section(
                        SectionKey.CAREERS_CTA,
                        null,
                        "Ready to start?",
                        "Have your licence, certificate and Ghana Card or passport to hand — it makes the"
                                + " next step much quicker.",
                        null,
                        List.of())));
    }

    private Section.Item item(String key, String icon, String title, String body) {
        return new Section.Item(key, icon, en(title), en(body));
    }

    private Section section(
            SectionKey key, String eyebrow, String heading, String subheading, String body, List<Section.Item> items) {
        var now = Instant.now();
        return new Section(
                null,
                1,
                key,
                eyebrow == null ? null : en(eyebrow),
                en(heading),
                subheading == null ? null : en(subheading),
                body == null ? null : en(body),
                items,
                null,
                PublicationStatus.PUBLISHED,
                null,
                now,
                now,
                "system",
                "system",
                null);
    }
}
