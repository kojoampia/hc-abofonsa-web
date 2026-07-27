package net.jojoaddison.abofonsa.web.rest;

import java.time.Duration;
import java.util.List;
import net.jojoaddison.abofonsa.domain.enumeration.Locale;
import net.jojoaddison.abofonsa.service.SiteContentService;
import net.jojoaddison.abofonsa.service.dto.CareServiceDTO;
import net.jojoaddison.abofonsa.service.dto.CareersContentDTO;
import net.jojoaddison.abofonsa.service.dto.FaqDTO;
import net.jojoaddison.abofonsa.service.dto.PlanDTO;
import net.jojoaddison.abofonsa.service.dto.SiteContentDTO;
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
public class ContentResource {

    private static final CacheControl CACHE_CONTROL =
            CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic();

    private final SiteContentService siteContentService;

    public ContentResource(SiteContentService siteContentService) {
        this.siteContentService = siteContentService;
    }

    @GetMapping("/api/v1/content/site")
    public ResponseEntity<SiteContentDTO> site(@RequestParam(defaultValue = "en") Locale locale) {
        return ResponseEntity.ok().cacheControl(CACHE_CONTROL).body(siteContentService.publishedSite(locale));
    }

    /** The careers page's content (careers-plan.md §5). Separate from /site so the home page does
     * not pay for content it never renders, and so careers FAQs cannot leak into the family
     * accordion. */
    @GetMapping("/api/v1/content/careers")
    public ResponseEntity<CareersContentDTO> careers(@RequestParam(defaultValue = "en") Locale locale) {
        return ResponseEntity.ok().cacheControl(CACHE_CONTROL).body(siteContentService.publishedCareers(locale));
    }

    @GetMapping("/api/v1/content/services")
    public ResponseEntity<List<CareServiceDTO>> services(@RequestParam(defaultValue = "en") Locale locale) {
        return ResponseEntity.ok().cacheControl(CACHE_CONTROL).body(siteContentService.publishedServices(locale));
    }

    @GetMapping("/api/v1/content/plans")
    public ResponseEntity<List<PlanDTO>> plans(@RequestParam(defaultValue = "en") Locale locale) {
        return ResponseEntity.ok().cacheControl(CACHE_CONTROL).body(siteContentService.publishedPlans(locale));
    }

    @GetMapping("/api/v1/content/faqs")
    public ResponseEntity<List<FaqDTO>> faqs(@RequestParam(defaultValue = "en") Locale locale) {
        return ResponseEntity.ok().cacheControl(CACHE_CONTROL).body(siteContentService.publishedFaqs(locale));
    }
}
