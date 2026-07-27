package net.jojoaddison.abofonsa.config.dbmigrations;

import java.util.EnumMap;
import net.jojoaddison.abofonsa.domain.LocalizedText;
import net.jojoaddison.abofonsa.domain.enumeration.Locale;

/**
 * Seed-changelog helper for building {@link LocalizedText} literals concisely. The Spanish,
 * French and German values throughout the {@code V00*} seed changelogs are working translations
 * written for this build, not yet reviewed by a native speaker of each language — spec §10.7
 * requires that review before any locale's content merges to production. English is transcribed
 * verbatim from {@code Abofonsa_BridgeCare_Website.html} and is authoritative.
 */
final class SeedText {

    private SeedText() {}

    /**
     * English only, relying on {@link LocalizedText#resolve}'s fallback for the other three.
     *
     * <p>Used by the careers seeds (careers-plan.md D-5): the four locales exist because *families*
     * are in the diaspora, whereas applicants are in Ghana. Seeding machine translations of
     * recruitment copy nobody has asked for would be inventing content, and worse, it would look
     * reviewed. An editor can translate a track in the CMS the day it is actually needed.
     */
    static LocalizedText en(String english) {
        var values = new EnumMap<Locale, String>(Locale.class);
        values.put(Locale.EN, english);
        return new LocalizedText(values);
    }

    static LocalizedText lt(String en, String es, String fr, String de) {
        var values = new EnumMap<Locale, String>(Locale.class);
        values.put(Locale.EN, en);
        values.put(Locale.ES, es);
        values.put(Locale.FR, fr);
        values.put(Locale.DE, de);
        return new LocalizedText(values);
    }
}
