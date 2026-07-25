package net.jojoaddison.abofonsa.content;

import java.time.Duration;
import java.util.List;
import net.jojoaddison.abofonsa.common.Locale;
import net.jojoaddison.abofonsa.content.view.FaqView;
import net.jojoaddison.abofonsa.content.view.PlanView;
import net.jojoaddison.abofonsa.content.view.ServiceView;
import net.jojoaddison.abofonsa.content.view.SiteContentView;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public, unauthenticated, read-only content API (spec §7.4) — every response carries
 * {@code Cache-Control: public, max-age=300} and is backed by {@link SiteContentService}'s
 * Caffeine cache.
 */
@RestController
public class ContentController {

    private static final CacheControl CACHE_CONTROL =
            CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic();

    private final SiteContentService siteContentService;

    public ContentController(SiteContentService siteContentService) {
        this.siteContentService = siteContentService;
    }

    @GetMapping("/api/v1/content/site")
    public ResponseEntity<SiteContentView> site(@RequestParam(defaultValue = "en") Locale locale) {
        return ResponseEntity.ok().cacheControl(CACHE_CONTROL).body(siteContentService.publishedSite(locale));
    }

    @GetMapping("/api/v1/content/services")
    public ResponseEntity<List<ServiceView>> services(@RequestParam(defaultValue = "en") Locale locale) {
        return ResponseEntity.ok().cacheControl(CACHE_CONTROL).body(siteContentService.publishedServices(locale));
    }

    @GetMapping("/api/v1/content/plans")
    public ResponseEntity<List<PlanView>> plans(@RequestParam(defaultValue = "en") Locale locale) {
        return ResponseEntity.ok().cacheControl(CACHE_CONTROL).body(siteContentService.publishedPlans(locale));
    }

    @GetMapping("/api/v1/content/faqs")
    public ResponseEntity<List<FaqView>> faqs(@RequestParam(defaultValue = "en") Locale locale) {
        return ResponseEntity.ok().cacheControl(CACHE_CONTROL).body(siteContentService.publishedFaqs(locale));
    }
}
