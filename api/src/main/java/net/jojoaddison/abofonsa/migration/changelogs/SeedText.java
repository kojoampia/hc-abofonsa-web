package net.jojoaddison.abofonsa.migration.changelogs;

import java.util.EnumMap;
import net.jojoaddison.abofonsa.common.Locale;
import net.jojoaddison.abofonsa.common.LocalizedText;

/**
 * Seed-changelog helper for building {@link LocalizedText} literals concisely. The Spanish,
 * French and German values throughout the {@code V00*} seed changelogs are working translations
 * written for this build, not yet reviewed by a native speaker of each language — spec §10.7
 * requires that review before any locale's content merges to production. English is transcribed
 * verbatim from {@code Abofonsa_BridgeCare_Website.html} and is authoritative.
 */
final class SeedText {

    private SeedText() {}

    static LocalizedText lt(String en, String es, String fr, String de) {
        var values = new EnumMap<Locale, String>(Locale.class);
        values.put(Locale.EN, en);
        values.put(Locale.ES, es);
        values.put(Locale.FR, fr);
        values.put(Locale.DE, de);
        return new LocalizedText(values);
    }
}
