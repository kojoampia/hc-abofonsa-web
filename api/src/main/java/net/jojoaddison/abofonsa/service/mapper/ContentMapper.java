package net.jojoaddison.abofonsa.service.mapper;

import net.jojoaddison.abofonsa.domain.CareService;
import net.jojoaddison.abofonsa.domain.Faq;
import net.jojoaddison.abofonsa.domain.LocalizedText;
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

    /** CMS-created documents may omit any optional localised field entirely - a null field
     * renders as empty text, never an NPE taking down the whole public payload. */
    private static String resolve(LocalizedText text, Locale locale) {
        return text == null ? "" : text.resolve(locale);
    }

    public ContentMapper(PriceFormatter priceFormatter) {
        this.priceFormatter = priceFormatter;
    }

    public CareServiceDTO toView(CareService doc, Locale locale) {
        return new CareServiceDTO(
                doc.id(),
                doc.slug(),
                resolve(doc.name(), locale),
                resolve(doc.blurb(), locale),
                doc.points() == null
                        ? java.util.List.of()
                        : doc.points().stream().map(p -> resolve(p, locale)).toList(),
                resolve(doc.availableOn(), locale),
                null,
                doc.displayOrder());
    }

    public PlanDTO toView(Plan doc, Locale locale) {
        var features = (doc.features() == null ? java.util.List.<Plan.PlanFeature>of() : doc.features())
                .stream()
                        .map(f -> new PlanFeatureDTO(resolve(f.label(), locale), f.included(), f.emphasised()))
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
                resolve(doc.name(), locale),
                resolve(doc.forWho(), locale),
                priceFormatter.format(doc.price().amount(), locale),
                doc.price().currency(),
                resolve(doc.priceNote(), locale),
                doc.featured(),
                features,
                comparison,
                doc.displayOrder());
    }

    public TestimonialDTO toView(Testimonial doc, Locale locale) {
        return new TestimonialDTO(
                doc.id(),
                resolve(doc.quote(), locale),
                doc.personName(),
                resolve(doc.personRole(), locale),
                resolve(doc.planLabel(), locale),
                doc.rating(),
                null,
                doc.displayOrder());
    }

    public FaqDTO toView(Faq doc, Locale locale) {
        return new FaqDTO(doc.id(), resolve(doc.question(), locale), resolve(doc.answer(), locale), doc.displayOrder());
    }

    public SectionDTO toView(Section doc, Locale locale) {
        var items = doc.items() == null
                ? java.util.List.<SectionItemDTO>of()
                : doc.items().stream()
                        .map(i -> new SectionItemDTO(
                                i.key(), i.icon(), resolve(i.title(), locale), resolve(i.body(), locale)))
                        .toList();
        return new SectionDTO(
                resolve(doc.eyebrow(), locale),
                resolve(doc.heading(), locale),
                resolve(doc.subheading(), locale),
                resolve(doc.body(), locale),
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
                resolve(doc.tagline(), locale),
                doc.phones(),
                doc.whatsapp(),
                doc.email(),
                address,
                resolve(doc.coordinationHours(), locale),
                resolve(doc.onCallHours(), locale));
    }
}
