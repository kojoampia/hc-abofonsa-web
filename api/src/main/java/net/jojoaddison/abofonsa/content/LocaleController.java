package net.jojoaddison.abofonsa.content;

import java.util.List;
import java.util.Map;
import net.jojoaddison.abofonsa.common.Locale;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class LocaleController {

    @GetMapping("/api/v1/locales")
    public List<Map<String, String>> locales() {
        return Locale.ALL.stream()
                .map(l -> Map.of("code", l.code(), "displayName", l.displayName()))
                .toList();
    }
}
