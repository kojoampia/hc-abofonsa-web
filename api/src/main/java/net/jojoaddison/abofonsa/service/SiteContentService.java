package net.jojoaddison.abofonsa.service;

import static net.jojoaddison.abofonsa.config.CacheConfiguration.SITE_CONTENT;

import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import net.jojoaddison.abofonsa.domain.enumeration.Locale;
import net.jojoaddison.abofonsa.domain.enumeration.PublicationStatus;
import net.jojoaddison.abofonsa.repository.CareServiceRepository;
import net.jojoaddison.abofonsa.repository.FaqRepository;
import net.jojoaddison.abofonsa.repository.PlanRepository;
import net.jojoaddison.abofonsa.repository.SectionRepository;
import net.jojoaddison.abofonsa.repository.SiteSettingsRepository;
import net.jojoaddison.abofonsa.repository.TestimonialRepository;
import net.jojoaddison.abofonsa.service.dto.CareServiceDTO;
import net.jojoaddison.abofonsa.service.dto.FaqDTO;
import net.jojoaddison.abofonsa.service.dto.PlanDTO;
import net.jojoaddison.abofonsa.service.dto.SiteContentDTO;
import net.jojoaddison.abofonsa.service.mapper.ContentMapper;
import net.jojoaddison.abofonsa.web.rest.errors.ContentNotFoundException;
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
    private final CareServiceRepository serviceRepository;
    private final PlanRepository planRepository;
    private final TestimonialRepository testimonialRepository;
    private final FaqRepository faqRepository;
    private final ContentMapper mapper;

    public SiteContentService(
            SiteSettingsRepository siteSettingsRepository,
            SectionRepository sectionRepository,
            CareServiceRepository serviceRepository,
            PlanRepository planRepository,
            TestimonialRepository testimonialRepository,
            FaqRepository faqRepository,
            ContentMapper mapper) {
        this.siteSettingsRepository = siteSettingsRepository;
        this.sectionRepository = sectionRepository;
        this.serviceRepository = serviceRepository;
        this.planRepository = planRepository;
        this.testimonialRepository = testimonialRepository;
        this.faqRepository = faqRepository;
        this.mapper = mapper;
    }

    @Cacheable(cacheNames = SITE_CONTENT, key = "#locale.code()")
    public SiteContentDTO publishedSite(Locale locale) {
        var settings = siteSettingsRepository
                .findTheSettings()
                .orElseThrow(() -> new ContentNotFoundException("siteSettings has not been seeded"));

        var sections = new LinkedHashMap<String, net.jojoaddison.abofonsa.service.dto.SectionDTO>();
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

        return new SiteContentDTO(
                locale.code(),
                Instant.now(),
                mapper.toView(settings, locale),
                sections,
                services,
                plans,
                testimonials,
                faqs);
    }

    public java.util.List<CareServiceDTO> publishedServices(Locale locale) {
        return publishedSite(locale).services();
    }

    public java.util.List<PlanDTO> publishedPlans(Locale locale) {
        return publishedSite(locale).plans();
    }

    public java.util.List<FaqDTO> publishedFaqs(Locale locale) {
        return publishedSite(locale).faqs();
    }
}
