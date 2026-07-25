package net.jojoaddison.abofonsa.service.mapper;

import net.jojoaddison.abofonsa.domain.CareService;
import net.jojoaddison.abofonsa.domain.Faq;
import net.jojoaddison.abofonsa.domain.Plan;
import net.jojoaddison.abofonsa.domain.Section;
import net.jojoaddison.abofonsa.domain.SiteSettings;
import net.jojoaddison.abofonsa.domain.Testimonial;
import net.jojoaddison.abofonsa.domain.enumeration.Locale;
import net.jojoaddison.abofonsa.service.PriceFormatter;
import net.jojoaddison.abofonsa.service.dto.AddressDTO;
import net.jojoaddison.abofonsa.service.dto.CareServiceDTO;
import net.jojoaddison.abofonsa.service.dto.FaqDTO;
import net.jojoaddison.abofonsa.service.dto.PlanComparisonDTO;
import net.jojoaddison.abofonsa.service.dto.PlanDTO;
import net.jojoaddison.abofonsa.service.dto.PlanFeatureDTO;
import net.jojoaddison.abofonsa.service.dto.SectionDTO;
import net.jojoaddison.abofonsa.service.dto.SectionItemDTO;
import net.jojoaddison.abofonsa.service.dto.SiteSettingsDTO;
import net.jojoaddison.abofonsa.service.dto.TestimonialDTO;
import org.springframework.stereotype.Component;

/**
 * Explicit, hand-written mapping from Mongo documents to flat, locale-resolved API view records
 * (spec §7.1) — no reflection-based mapping framework, so a field rename fails at compile time
 * rather than silently dropping data at runtime.
 *
 * <p>{@code image}/{@code portrait} fields resolve to {@code null} until Phase 6 wires the media
 * library; the view record shapes are already final so that phase adds behaviour, not schema
 * changes.
 */
@Component
public class ContentMapper {

    private final PriceFormatter priceFormatter;

    public ContentMapper(PriceFormatter priceFormatter) {
        this.priceFormatter = priceFormatter;
    }

    public CareServiceDTO toView(CareService doc, Locale locale) {
        return new CareServiceDTO(
                doc.id(),
                doc.slug(),
                doc.name().resolve(locale),
                doc.blurb().resolve(locale),
                doc.points().stream().map(p -> p.resolve(locale)).toList(),
                doc.availableOn().resolve(locale),
                null,
                doc.displayOrder());
    }

    public PlanDTO toView(Plan doc, Locale locale) {
        var features = doc.features().stream()
                .map(f -> new PlanFeatureDTO(f.label().resolve(locale), f.included(), f.emphasised()))
                .toList();
        var comparison = new PlanComparisonDTO(
                doc.comparison().visitsPerWeek().resolve(locale),
                doc.comparison().medicalSupport().resolve(locale),
                doc.comparison().auxiliary().resolve(locale),
                doc.comparison().telemetry().resolve(locale),
                doc.comparison().reporting().resolve(locale),
                doc.comparison().careManager().resolve(locale));
        return new PlanDTO(
                doc.id(),
                doc.code(),
                doc.name().resolve(locale),
                doc.forWho().resolve(locale),
                priceFormatter.format(doc.price().amount(), locale),
                doc.price().currency(),
                doc.priceNote().resolve(locale),
                doc.featured(),
                features,
                comparison,
                doc.displayOrder());
    }

    public TestimonialDTO toView(Testimonial doc, Locale locale) {
        return new TestimonialDTO(
                doc.id(),
                doc.quote().resolve(locale),
                doc.personName(),
                doc.personRole().resolve(locale),
                doc.planLabel().resolve(locale),
                doc.rating(),
                null,
                doc.displayOrder());
    }

    public FaqDTO toView(Faq doc, Locale locale) {
        return new FaqDTO(doc.id(), doc.question().resolve(locale), doc.answer().resolve(locale), doc.displayOrder());
    }

    public SectionDTO toView(Section doc, Locale locale) {
        var items = doc.items() == null
                ? java.util.List.<SectionItemDTO>of()
                : doc.items().stream()
                        .map(i -> new SectionItemDTO(
                                i.key(),
                                i.icon(),
                                i.title().resolve(locale),
                                i.body().resolve(locale)))
                        .toList();
        return new SectionDTO(
                doc.eyebrow().resolve(locale),
                doc.heading().resolve(locale),
                doc.subheading().resolve(locale),
                doc.body().resolve(locale),
                items,
                null);
    }

    public SiteSettingsDTO toView(SiteSettings doc, Locale locale) {
        var address = new AddressDTO(
                doc.address().street(),
                doc.address().district(),
                doc.address().city(),
                doc.address().country());
        return new SiteSettingsDTO(
                doc.organisationName(),
                doc.tagline().resolve(locale),
                doc.phones(),
                doc.whatsapp(),
                doc.email(),
                address,
                doc.coordinationHours().resolve(locale),
                doc.onCallHours().resolve(locale));
    }
}
