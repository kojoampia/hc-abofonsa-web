package net.jojoaddison.abofonsa.content;

import static net.jojoaddison.abofonsa.config.CacheConfig.SITE_CONTENT;

import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import net.jojoaddison.abofonsa.common.ContentNotFoundException;
import net.jojoaddison.abofonsa.common.Locale;
import net.jojoaddison.abofonsa.common.PublicationStatus;
import net.jojoaddison.abofonsa.content.view.FaqView;
import net.jojoaddison.abofonsa.content.view.PlanView;
import net.jojoaddison.abofonsa.content.view.ServiceView;
import net.jojoaddison.abofonsa.content.view.SiteContentView;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

/**
 * Assembles the single aggregate public payload — every published section, service, plan,
 * testimonial and FAQ for one locale (spec §7.4 AD-3). {@code PUBLISHED} entities only; a
 * {@code DRAFT} edit never reaches this view until an editor explicitly publishes it (spec §9.5).
 */
@Service
public class SiteContentService {

    private final SiteSettingsRepository siteSettingsRepository;
    private final SectionRepository sectionRepository;
    private final ServiceRepository serviceRepository;
    private final PlanRepository planRepository;
    private final TestimonialRepository testimonialRepository;
    private final FaqRepository faqRepository;
    private final ContentViewMapper mapper;

    public SiteContentService(
            SiteSettingsRepository siteSettingsRepository,
            SectionRepository sectionRepository,
            ServiceRepository serviceRepository,
            PlanRepository planRepository,
            TestimonialRepository testimonialRepository,
            FaqRepository faqRepository,
            ContentViewMapper mapper) {
        this.siteSettingsRepository = siteSettingsRepository;
        this.sectionRepository = sectionRepository;
        this.serviceRepository = serviceRepository;
        this.planRepository = planRepository;
        this.testimonialRepository = testimonialRepository;
        this.faqRepository = faqRepository;
        this.mapper = mapper;
    }

    @Cacheable(cacheNames = SITE_CONTENT, key = "#locale.code()")
    public SiteContentView publishedSite(Locale locale) {
        var settings = siteSettingsRepository
                .findTheSettings()
                .orElseThrow(() -> new ContentNotFoundException("siteSettings has not been seeded"));

        var sections = new LinkedHashMap<String, net.jojoaddison.abofonsa.content.view.SectionView>();
        sectionRepository.findByStatus(PublicationStatus.PUBLISHED).stream()
                .sorted(Comparator.comparing(s -> s.key().ordinal()))
                .forEach(
                        s -> sections.put(s.key().name().toLowerCase(java.util.Locale.ROOT), mapper.toView(s, locale)));

        var services = serviceRepository.findByStatusOrderByDisplayOrderAsc(PublicationStatus.PUBLISHED).stream()
                .map(s -> mapper.toView(s, locale))
                .toList();

        var plans = planRepository.findByStatusOrderByDisplayOrderAsc(PublicationStatus.PUBLISHED).stream()
                .map(p -> mapper.toView(p, locale))
                .toList();

        var testimonials =
                testimonialRepository.findByStatusOrderByDisplayOrderAsc(PublicationStatus.PUBLISHED).stream()
                        .map(t -> mapper.toView(t, locale))
                        .toList();

        var faqs = faqRepository.findByStatusOrderByDisplayOrderAsc(PublicationStatus.PUBLISHED).stream()
                .map(f -> mapper.toView(f, locale))
                .toList();

        return new SiteContentView(
                locale.code(),
                Instant.now(),
                mapper.toView(settings, locale),
                sections,
                services,
                plans,
                testimonials,
                faqs);
    }

    public java.util.List<ServiceView> publishedServices(Locale locale) {
        return publishedSite(locale).services();
    }

    public java.util.List<PlanView> publishedPlans(Locale locale) {
        return publishedSite(locale).plans();
    }

    public java.util.List<FaqView> publishedFaqs(Locale locale) {
        return publishedSite(locale).faqs();
    }
}
