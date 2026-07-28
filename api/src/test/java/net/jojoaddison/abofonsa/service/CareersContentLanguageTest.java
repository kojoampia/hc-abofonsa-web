package net.jojoaddison.abofonsa.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import net.jojoaddison.abofonsa.domain.CareerTrack;
import net.jojoaddison.abofonsa.domain.Faq;
import net.jojoaddison.abofonsa.domain.LocalizedText;
import net.jojoaddison.abofonsa.domain.Section;
import net.jojoaddison.abofonsa.domain.enumeration.FaqCategory;
import net.jojoaddison.abofonsa.domain.enumeration.Locale;
import org.junit.jupiter.api.Test;

/**
 * The rule behind {@code CareersContentDTO.contentLanguage} (careers-plan.md Phase C3).
 *
 * <p>Careers copy is seeded English-only by decision (D-5), so every non-English request resolves to
 * English text while the page still renders {@code <html lang="es">}. That is a WCAG 2.2 AA failure
 * under 3.1.2 Language of Parts, and no automated checker finds it — axe-core validates that
 * {@code lang} is present and well-formed, never that it describes the words. The server therefore
 * reports which language it actually served, and the client marks the difference.
 *
 * <p>Driven here rather than through the HTTP layer because the interesting cases are the ones the
 * seed data cannot produce: a fully translated payload, and a half-translated one.
 */
class CareersContentLanguageTest {

    private static LocalizedText en(String value) {
        return new LocalizedText(Map.of(Locale.EN, value));
    }

    private static LocalizedText all(String value) {
        var values = new EnumMap<Locale, String>(Locale.class);
        Locale.ALL.forEach(locale -> values.put(locale, value));
        return new LocalizedText(values);
    }

    private static Section section(LocalizedText heading, List<Section.Item> items) {
        return new Section(
                "s1",
                1,
                net.jojoaddison.abofonsa.domain.enumeration.SectionKey.CAREERS_HERO,
                null,
                heading,
                null,
                null,
                items,
                null,
                net.jojoaddison.abofonsa.domain.enumeration.PublicationStatus.PUBLISHED,
                null,
                null,
                null,
                "system",
                "system",
                null);
    }

    private static CareerTrack track(LocalizedText title, List<LocalizedText> requirements) {
        return new CareerTrack(
                "t1",
                1,
                "registered-nurse",
                title,
                title,
                requirements,
                requirements,
                net.jojoaddison.abofonsa.domain.enumeration.AuthorityRole.ROLE_NURSE,
                true,
                1,
                net.jojoaddison.abofonsa.domain.enumeration.PublicationStatus.PUBLISHED,
                null,
                null,
                null,
                "system",
                "system",
                null);
    }

    private static Faq faq(LocalizedText text) {
        return new Faq(
                "f1",
                1,
                text,
                text,
                FaqCategory.CAREERS,
                1,
                net.jojoaddison.abofonsa.domain.enumeration.PublicationStatus.PUBLISHED,
                null,
                null,
                null,
                "system",
                "system",
                null);
    }

    private static String languageFor(Locale locale, List<Section> sections, List<CareerTrack> tracks, List<Faq> faqs) {
        return SiteContentService.careersContentLanguage(locale, sections, tracks, faqs);
    }

    @Test
    void englishIsAlwaysReportedAsEnglish() {
        assertThat(languageFor(Locale.EN, List.of(section(en("Join us"), List.of())), List.of(), List.of()))
                .isEqualTo("en");
    }

    @Test
    void anEnglishOnlyPayloadRequestedInSpanishReportsEnglish() {
        var language = languageFor(
                Locale.ES,
                List.of(section(en("Join us"), List.of())),
                List.of(track(en("Registered nurse"), List.of(en("A licence")))),
                List.of(faq(en("How long does it take?"))));

        assertThat(language).isEqualTo("en");
    }

    /**
     * The case that keeps the attribute from becoming permanent. Once the copy really is translated
     * the payload must claim the requested locale, or Spanish prose ends up labelled English — the
     * same defect pointing the other way, and with nothing left to prompt anyone to remove it.
     */
    @Test
    void aFullyTranslatedPayloadReportsTheRequestedLocale() {
        var language = languageFor(
                Locale.ES,
                List.of(section(all("Únete"), List.of(new Section.Item("k", null, all("Título"), all("Cuerpo"))))),
                List.of(track(all("Enfermera"), List.of(all("Una licencia")))),
                List.of(faq(all("¿Cuánto tarda?"))));

        assertThat(language).isEqualTo("es");
    }

    /**
     * Partial translation resolves to English deliberately, and this pins that choice rather than
     * discovering it later. Both answers mislabel something; English is the lesser error, because
     * the failure it prevents — English words voiced with Spanish phonetics — is the one that makes
     * a page unusable, whereas Spanish voiced as English stays broadly intelligible. The all-or-
     * nothing rule is documented on the service, and the CMS shows per-locale completeness so this
     * is a state an editor is working through rather than one they settle in.
     */
    @Test
    void aPartlyTranslatedPayloadFallsBackToEnglishRatherThanClaimingTheLocale() {
        var language = languageFor(
                Locale.ES,
                List.of(section(all("Únete"), List.of())),
                List.of(track(all("Enfermera"), List.of(en("A licence")))), // one requirement untranslated
                List.of(faq(all("¿Cuánto tarda?"))));

        assertThat(language).isEqualTo("en");
    }

    /** An optional field nobody filled in is not an untranslated one. */
    @Test
    void absentOptionalFieldsDoNotCountAsMissingTranslations() {
        // `section` leaves eyebrow, subheading and body null throughout.
        var language = languageFor(Locale.FR, List.of(section(all("Rejoignez-nous"), List.of())), List.of(), List.of());

        assertThat(language).isEqualTo("fr");
    }

    @Test
    void anEmptyPayloadReportsTheRequestedLocaleRatherThanClaimingAFallback() {
        // Nothing was served, so nothing was served in the wrong language; the client then adds no
        // attribute, which is right — there is no text to mislabel.
        assertThat(languageFor(Locale.DE, List.of(), List.of(), List.of())).isEqualTo("de");
    }
}
