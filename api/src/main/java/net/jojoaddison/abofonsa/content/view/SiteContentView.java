package net.jojoaddison.abofonsa.content.view;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/** The single aggregate payload behind {@code GET /api/v1/content/site} (spec §7.4 AD-3) — every
 * published section, service, plan, testimonial and FAQ for one locale, in one cached response. */
public record SiteContentView(
        String locale,
        Instant generatedAt,
        SiteSettingsView siteSettings,
        Map<String, SectionView> sections,
        List<ServiceView> services,
        List<PlanView> plans,
        List<TestimonialView> testimonials,
        List<FaqView> faqs) {}
