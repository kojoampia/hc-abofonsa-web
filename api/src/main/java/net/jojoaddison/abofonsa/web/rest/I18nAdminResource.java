package net.jojoaddison.abofonsa.web.rest;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import net.jojoaddison.abofonsa.domain.enumeration.Locale;
import net.jojoaddison.abofonsa.service.I18nService;
import net.jojoaddison.abofonsa.service.dto.I18nCoverageDTO;
import net.jojoaddison.abofonsa.service.dto.I18nOverridesDTO;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** The translation workspace API (spec §7.5 i18n rows, §9.4 T-1..T-7). */
@RestController
public class I18nAdminResource {

    private final I18nService i18nService;

    public I18nAdminResource(I18nService i18nService) {
        this.i18nService = i18nService;
    }

    @GetMapping("/api/v1/admin/i18n/coverage")
    @PreAuthorize("hasRole('VIEWER')")
    public List<I18nCoverageDTO> coverage() {
        return i18nService.coverage();
    }

    @GetMapping("/api/v1/admin/i18n/{locale}")
    @PreAuthorize("hasRole('VIEWER')")
    public I18nOverridesDTO get(@PathVariable Locale locale) {
        return i18nService.adminView(locale);
    }

    @PutMapping("/api/v1/admin/i18n/{locale}")
    @PreAuthorize("hasRole('EDITOR')")
    public I18nOverridesDTO put(
            @PathVariable Locale locale, @RequestBody Map<String, String> entries, Principal principal) {
        return i18nService.putOverrides(locale, entries, principal.getName());
    }

    @DeleteMapping("/api/v1/admin/i18n/{locale}/{key}")
    @PreAuthorize("hasRole('EDITOR')")
    public I18nOverridesDTO delete(@PathVariable Locale locale, @PathVariable String key, Principal principal) {
        return i18nService.deleteOverride(locale, key, principal.getName());
    }
}
