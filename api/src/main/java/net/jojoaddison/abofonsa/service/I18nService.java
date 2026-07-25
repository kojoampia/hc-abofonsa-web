package net.jojoaddison.abofonsa.service;

import static net.jojoaddison.abofonsa.config.CacheConfiguration.I18N_BUNDLE;

import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import net.jojoaddison.abofonsa.domain.UiTranslationOverride;
import net.jojoaddison.abofonsa.domain.enumeration.AuditAction;
import net.jojoaddison.abofonsa.domain.enumeration.ContentType;
import net.jojoaddison.abofonsa.domain.enumeration.Locale;
import net.jojoaddison.abofonsa.repository.UiTranslationOverrideRepository;
import net.jojoaddison.abofonsa.service.dto.I18nCoverageDTO;
import net.jojoaddison.abofonsa.service.dto.I18nOverridesDTO;
import net.jojoaddison.abofonsa.web.rest.errors.ContentNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

/**
 * UI translation defaults-plus-overrides (spec §10.3, §9.4). The shipped bundles remain
 * authoritative: an override never replaces a default permanently — deleting it reverts (T-4) —
 * and every override write evicts the public bundle cache so corrections land without a deploy.
 */
@Service
public class I18nService {

    private static final Logger log = LoggerFactory.getLogger(I18nService.class);

    private final UiTranslationOverrideRepository repository;
    private final AuditService auditService;
    private final ContentAdminService contentAdminService;
    private final Map<Locale, Map<String, String>> defaults;

    public I18nService(
            UiTranslationOverrideRepository repository,
            AuditService auditService,
            ContentAdminService contentAdminService,
            ObjectMapper objectMapper) {
        this.repository = repository;
        this.auditService = auditService;
        this.contentAdminService = contentAdminService;
        this.defaults = loadDefaults(objectMapper);
    }

    @Cacheable(cacheNames = I18N_BUNDLE, key = "#locale.code()")
    public Map<String, String> overrides(Locale locale) {
        return repository
                .findByLocale(locale)
                .map(UiTranslationOverride::entries)
                .orElse(Map.of());
    }

    public I18nOverridesDTO adminView(Locale locale) {
        return new I18nOverridesDTO(
                locale.code(),
                defaults.getOrDefault(locale, Map.of()),
                repository
                        .findByLocale(locale)
                        .map(UiTranslationOverride::entries)
                        .orElse(Map.of()));
    }

    @CacheEvict(cacheNames = I18N_BUNDLE, allEntries = true)
    public I18nOverridesDTO putOverrides(Locale locale, Map<String, String> entries, String actorId) {
        var knownKeys = defaults.getOrDefault(Locale.EN, Map.of()).keySet();
        if (!knownKeys.isEmpty()) {
            var unknown = entries.keySet().stream()
                    .filter(key -> !knownKeys.contains(key))
                    .toList();
            if (!unknown.isEmpty()) {
                throw ContentNotFoundException.forId("UI string key(s)", String.join(", ", unknown));
            }
        }
        var existing = repository.findByLocale(locale).orElse(null);
        var merged = new LinkedHashMap<String, String>();
        if (existing != null) {
            merged.putAll(existing.entries());
        }
        merged.putAll(entries);
        repository.save(new UiTranslationOverride(
                existing == null ? null : existing.id(), 1, locale, merged, Instant.now(), actorId));
        auditService.record(
                actorId,
                actorId,
                AuditAction.TRANSLATION_UPDATED,
                "I18N",
                locale.code(),
                Map.of("keys", entries.keySet().stream().toList()));
        return adminView(locale);
    }

    /** Dropping an override reverts to the shipped default (spec §9.4 T-4). */
    @CacheEvict(cacheNames = I18N_BUNDLE, allEntries = true)
    public I18nOverridesDTO deleteOverride(Locale locale, String key, String actorId) {
        var existing = repository
                .findByLocale(locale)
                .orElseThrow(() -> ContentNotFoundException.forId("overrides for locale", locale.code()));
        var remaining = new LinkedHashMap<>(existing.entries());
        if (remaining.remove(key) == null) {
            throw ContentNotFoundException.forId("override", key);
        }
        repository.save(new UiTranslationOverride(existing.id(), 1, locale, remaining, Instant.now(), actorId));
        auditService.record(
                actorId, actorId, AuditAction.TRANSLATION_UPDATED, "I18N", locale.code(), Map.of("reverted", key));
        return adminView(locale);
    }

    /** Missing-key report across all locales (spec §9.4 T-7), against the shipped en.json set. */
    public List<I18nCoverageDTO> coverage() {
        var englishKeys = defaults.getOrDefault(Locale.EN, Map.of()).keySet();
        var contentCompleteness = contentCompletenessPerLocale();
        return Locale.ALL.stream()
                .map(locale -> {
                    var localeKeys = defaults.getOrDefault(locale, Map.<String, String>of())
                            .keySet();
                    var missing = englishKeys.stream()
                            .filter(key -> !localeKeys.contains(key))
                            .sorted()
                            .toList();
                    var overridden = repository
                            .findByLocale(locale)
                            .map(o -> o.entries().size())
                            .orElse(0);
                    return new I18nCoverageDTO(
                            locale.code(),
                            englishKeys.size(),
                            missing,
                            overridden,
                            contentCompleteness.getOrDefault(locale.code(), 1.0));
                })
                .toList();
    }

    private Map<String, Double> contentCompletenessPerLocale() {
        var sums = new LinkedHashMap<String, double[]>(); // locale -> [sum, count]
        for (var type : ContentType.values()) {
            for (var dto : contentAdminService.list(type)) {
                dto.completeness()
                        .forEach((locale, fraction) -> sums.computeIfAbsent(locale, k -> new double[2])[0] += fraction);
                dto.completeness().forEach((locale, fraction) -> sums.get(locale)[1] += 1);
            }
        }
        var averages = new LinkedHashMap<String, Double>();
        sums.forEach((locale, pair) -> averages.put(locale, pair[1] == 0 ? 1.0 : pair[0] / pair[1]));
        return averages;
    }

    /** Loads the shipped bundles copied onto the classpath at build time; flattens nested JSON to
     * the dot-delimited key namespace (spec §10.2). Missing bundles degrade to an empty set. */
    private static Map<Locale, Map<String, String>> loadDefaults(ObjectMapper objectMapper) {
        var result = new LinkedHashMap<Locale, Map<String, String>>();
        for (var locale : Locale.ALL) {
            try (var stream = I18nService.class.getResourceAsStream("/i18n/" + locale.code() + ".json")) {
                if (stream == null) {
                    log.warn(
                            "No default i18n bundle for {} on the classpath; coverage will treat it as empty",
                            locale.code());
                    result.put(locale, Map.of());
                    continue;
                }
                Map<String, Object> raw = objectMapper.readValue(stream, Map.class);
                var flat = new LinkedHashMap<String, String>();
                flatten("", raw, flat);
                result.put(locale, Map.copyOf(flat));
            } catch (IOException e) {
                log.warn("Failed to read default i18n bundle for {}", locale.code(), e);
                result.put(locale, Map.of());
            }
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private static void flatten(String prefix, Map<String, Object> node, Map<String, String> out) {
        node.forEach((key, value) -> {
            var path = prefix.isEmpty() ? key : prefix + "." + key;
            if (value instanceof Map<?, ?> nested) {
                flatten(path, (Map<String, Object>) nested, out);
            } else {
                out.put(path, String.valueOf(value));
            }
        });
    }
}
