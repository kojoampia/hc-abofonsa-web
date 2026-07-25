package net.jojoaddison.abofonsa.service;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import net.jojoaddison.abofonsa.domain.enumeration.Locale;
import org.bson.Document;

/**
 * Static helpers for working with raw content documents whose localised fields are embedded
 * per-locale maps ({@code { "en": "…", "es": "…" }}, spec §8.1). The admin CRUD layer operates on
 * raw BSON documents — one code path for all six content types, with MongoDB's JSON Schema
 * validators as the structural backstop — so localisation rules are applied structurally here.
 */
final class LocalizedDocumentSupport {

    private static final Set<String> LOCALE_CODES = Set.of("en", "es", "fr", "de");

    private LocalizedDocumentSupport() {}

    /** A map is "localised" when non-empty and every key is a supported locale code with a
     * string (or null) value. Empty maps are deliberately-blank text, not localised fields. */
    static boolean isLocalizedMap(Object value) {
        if (!(value instanceof Map<?, ?> map) || map.isEmpty()) {
            return false;
        }
        return map.keySet().stream().allMatch(k -> k instanceof String s && LOCALE_CODES.contains(s));
    }

    /** Dotted paths of localised fields whose {@code en} value is missing or blank (E-6). */
    static List<String> englishGaps(Document document) {
        var gaps = new ArrayList<String>();
        walk(document, "", (path, map) -> {
            var en = map.get("en");
            if (!(en instanceof String s) || s.isBlank()) {
                gaps.add(path);
            }
        });
        return gaps;
    }

    /** Fraction of localised fields carrying a non-blank value, per locale — drives the CMS
     * progress bars (spec §7.3 {@code LocalizedText.completeness()}, generalised to documents). */
    static Map<String, Double> completeness(Document document) {
        var counts = new EnumMap<Locale, Integer>(Locale.class);
        var total = new int[] {0};
        walk(document, "", (path, map) -> {
            total[0]++;
            for (var locale : Locale.ALL) {
                if (map.get(locale.code()) instanceof String s && !s.isBlank()) {
                    counts.merge(locale, 1, Integer::sum);
                }
            }
        });
        var result = new java.util.LinkedHashMap<String, Double>();
        for (var locale : Locale.ALL) {
            result.put(locale.code(), total[0] == 0 ? 1.0 : counts.getOrDefault(locale, 0) / (double) total[0]);
        }
        return result;
    }

    private interface LocalizedFieldVisitor {
        void visit(String path, Map<?, ?> localizedMap);
    }

    @SuppressWarnings("unchecked")
    private static void walk(Object node, String path, LocalizedFieldVisitor visitor) {
        if (node instanceof Map<?, ?> map) {
            if (isLocalizedMap(map)) {
                visitor.visit(path, map);
                return;
            }
            for (var entry : ((Map<String, Object>) map).entrySet()) {
                walk(entry.getValue(), path.isEmpty() ? entry.getKey() : path + "." + entry.getKey(), visitor);
            }
        } else if (node instanceof List<?> list) {
            for (int i = 0; i < list.size(); i++) {
                walk(list.get(i), path + "[" + i + "]", visitor);
            }
        }
    }
}
