package net.jojoaddison.abofonsa.service;

import static net.jojoaddison.abofonsa.config.CacheConfiguration.I18N_BUNDLE;

import java.util.Map;
import net.jojoaddison.abofonsa.domain.UiTranslationOverride;
import net.jojoaddison.abofonsa.domain.enumeration.Locale;
import net.jojoaddison.abofonsa.repository.UiTranslationOverrideRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

/** Backs {@code GET /api/v1/i18n/{locale}.json} (spec §7.4/§10.3) — the CMS override map only;
 * the frontend's {@code TranslocoHttpLoader} merges this over the shipped JSON defaults. */
@Service
public class I18nService {

    private final UiTranslationOverrideRepository repository;

    public I18nService(UiTranslationOverrideRepository repository) {
        this.repository = repository;
    }

    @Cacheable(cacheNames = I18N_BUNDLE, key = "#locale.code()")
    public Map<String, String> overrides(Locale locale) {
        return repository
                .findByLocale(locale)
                .map(UiTranslationOverride::entries)
                .orElse(Map.of());
    }
}
