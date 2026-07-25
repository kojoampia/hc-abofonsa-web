package net.jojoaddison.abofonsa.service.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/** The single aggregate payload behind {@code GET /api/v1/content/site} (spec §7.4 AD-3) — every
 * published section, service, plan, testimonial and FAQ for one locale, in one cached response. */
public record SiteContentDTO(
        String locale,
        Instant generatedAt,
        SiteSettingsDTO siteSettings,
        Map<String, SectionDTO> sections,
        List<CareServiceDTO> services,
        List<PlanDTO> plans,
        List<TestimonialDTO> testimonials,
        List<FaqDTO> faqs) {}
