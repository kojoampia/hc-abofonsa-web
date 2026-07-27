package net.jojoaddison.abofonsa.config.dbmigrations;

import static net.jojoaddison.abofonsa.config.dbmigrations.SeedText.en;

import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.domain.Faq;
import net.jojoaddison.abofonsa.domain.enumeration.FaqCategory;
import net.jojoaddison.abofonsa.domain.enumeration.PublicationStatus;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/**
 * Questions from prospective staff, categorised {@code CAREERS} so the careers page can select them
 * and the home page's FAQ accordion continues to show only the family-facing ones.
 *
 * <p>Display order starts at 100 to keep these clear of the seeded family FAQs, which the careers
 * page never renders but which share the collection and its ordering.
 *
 * <p>Deliberately absent: anything about pay, contract type, or how long review takes. D-3 and D-4
 * are open, and a plausible-sounding guess is the kind of thing that gets quoted back later.
 */
@Component
public class V014SeedCareerFaqs implements Changelog {

    @Override
    public String id() {
        return "V014_seed_career_faqs";
    }

    @Override
    public void execute(MongoTemplate mongoTemplate) {
        mongoTemplate.insertAll(List.of(
                faq(
                        100,
                        "Do I need to be registered to apply?",
                        "Yes. Nurses need a current licence with the Nursing and Midwifery Council of Ghana,"
                                + " physicians full registration with the Medical and Dental Council, and other"
                                + " clinical roles registration with their own council. Care assistants need"
                                + " recognised training or equivalent experience with references. We verify"
                                + " registration with the issuing body before you can take a visit."),
                faq(
                        101,
                        "What documents will I be asked for?",
                        "A photograph, your Ghana Card or passport, your qualification certificate, and your"
                                + " current practising licence showing its expiry date. Having them ready before"
                                + " you start makes the process considerably faster — most delays are a missing"
                                + " or expired document."),
                faq(
                        102,
                        "What happens if something is missing from my application?",
                        "We will ask you for it. An application sent back for a correction is not a rejection —"
                                + " it is the normal way a missing certificate or an unclear scan gets resolved."
                                + " You will see what is needed and can add it without starting again."),
                faq(
                        103,
                        "Can I apply if I already work somewhere else?",
                        "Yes. Some roles, particularly visiting physician, are sessional and are designed to fit"
                                + " around an existing post. Tell us your availability during onboarding."),
                faq(
                        104,
                        "Where would I be working?",
                        "In patients' homes across Greater Accra — Teshie, Nungua, East Legon, Osu, Dansoman,"
                                + " Tema and the surrounding districts. Work outside this region is arranged"
                                + " case by case."),
                faq(
                        105,
                        "What if my licence expires while I am working with you?",
                        "We track expiry dates and will remind you before one lapses. An expired licence"
                                + " suspends your clinical access until it is renewed — that is a regulatory"
                                + " requirement, not a judgement about your work.")));
    }

    private Faq faq(int displayOrder, String question, String answer) {
        var now = Instant.now();
        return new Faq(
                null,
                1,
                en(question),
                en(answer),
                FaqCategory.CAREERS,
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
