package net.jojoaddison.abofonsa.domain;

import java.util.Map;
import net.jojoaddison.abofonsa.domain.enumeration.Locale;

/** A string carrying one value per supported locale (spec §7.3). */
public record LocalizedText(Map<Locale, String> values) {

    public LocalizedText {
        values = values == null ? Map.of() : Map.copyOf(values);
    }

    public static LocalizedText of(String english) {
        return new LocalizedText(Map.of(Locale.EN, english));
    }

    public static LocalizedText empty() {
        return new LocalizedText(Map.of());
    }

    /** Requested locale, else the default, else empty — never null. */
    public String resolve(Locale requested) {
        var direct = values.get(requested);
        if (direct != null && !direct.isBlank()) {
            return direct;
        }
        var fallback = values.get(Locale.EN);
        return fallback == null ? "" : fallback;
    }

    public boolean hasTranslation(Locale locale) {
        var v = values.get(locale);
        return v != null && !v.isBlank();
    }

    /** Fraction of supported locales with a non-blank value — drives the CMS progress bars. */
    public double completeness() {
        return (double) Locale.ALL.stream().filter(this::hasTranslation).count() / Locale.ALL.size();
    }
}
