package net.jojoaddison.abofonsa.common;

import java.util.List;

/**
 * One of the four locales this site supports. Deliberately named {@code Locale}, shadowing
 * {@code java.util.Locale} within this codebase (spec §7.3) — code in this project should never
 * need {@code java.util.Locale}; if it does, that is a sign the code belongs in a formatting
 * layer, not the domain.
 */
public enum Locale {
    EN("en", "English"),
    ES("es", "Español"),
    FR("fr", "Français"),
    DE("de", "Deutsch");

    public static final List<Locale> ALL = List.of(values());

    private final String code;
    private final String displayName;

    Locale(String code, String displayName) {
        this.code = code;
        this.displayName = displayName;
    }

    public String code() {
        return code;
    }

    public String displayName() {
        return displayName;
    }

    public static Locale fromCode(String code) {
        return ALL.stream()
                .filter(l -> l.code.equalsIgnoreCase(code))
                .findFirst()
                .orElseThrow(() -> new UnsupportedLocaleException(code));
    }
}
