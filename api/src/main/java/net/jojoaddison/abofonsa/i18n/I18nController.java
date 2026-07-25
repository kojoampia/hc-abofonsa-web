package net.jojoaddison.abofonsa.i18n;

import java.util.Map;
import net.jojoaddison.abofonsa.common.Locale;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class I18nController {

    private final I18nService i18nService;

    public I18nController(I18nService i18nService) {
        this.i18nService = i18nService;
    }

    @GetMapping("/api/v1/i18n/{locale}.json")
    public Map<String, String> overrides(@PathVariable("locale") Locale locale) {
        return i18nService.overrides(locale);
    }
}
