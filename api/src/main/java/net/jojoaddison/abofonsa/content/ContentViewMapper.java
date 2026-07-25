package net.jojoaddison.abofonsa.content;

import net.jojoaddison.abofonsa.common.Locale;
import net.jojoaddison.abofonsa.content.view.AddressView;
import net.jojoaddison.abofonsa.content.view.FaqView;
import net.jojoaddison.abofonsa.content.view.PlanComparisonView;
import net.jojoaddison.abofonsa.content.view.PlanFeatureView;
import net.jojoaddison.abofonsa.content.view.PlanView;
import net.jojoaddison.abofonsa.content.view.SectionItemView;
import net.jojoaddison.abofonsa.content.view.SectionView;
import net.jojoaddison.abofonsa.content.view.ServiceView;
import net.jojoaddison.abofonsa.content.view.SiteSettingsView;
import net.jojoaddison.abofonsa.content.view.TestimonialView;
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
public class ContentViewMapper {

    private final PriceFormatter priceFormatter;

    public ContentViewMapper(PriceFormatter priceFormatter) {
        this.priceFormatter = priceFormatter;
    }

    public ServiceView toView(ServiceDocument doc, Locale locale) {
        return new ServiceView(
                doc.id(),
                doc.slug(),
                doc.name().resolve(locale),
                doc.blurb().resolve(locale),
                doc.points().stream().map(p -> p.resolve(locale)).toList(),
                doc.availableOn().resolve(locale),
                null,
                doc.displayOrder());
    }

    public PlanView toView(PlanDocument doc, Locale locale) {
        var features = doc.features().stream()
                .map(f -> new PlanFeatureView(f.label().resolve(locale), f.included(), f.emphasised()))
                .toList();
        var comparison = new PlanComparisonView(
                doc.comparison().visitsPerWeek().resolve(locale),
                doc.comparison().medicalSupport().resolve(locale),
                doc.comparison().auxiliary().resolve(locale),
                doc.comparison().telemetry().resolve(locale),
                doc.comparison().reporting().resolve(locale),
                doc.comparison().careManager().resolve(locale));
        return new PlanView(
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

    public TestimonialView toView(TestimonialDocument doc, Locale locale) {
        return new TestimonialView(
                doc.id(),
                doc.quote().resolve(locale),
                doc.personName(),
                doc.personRole().resolve(locale),
                doc.planLabel().resolve(locale),
                doc.rating(),
                null,
                doc.displayOrder());
    }

    public FaqView toView(FaqDocument doc, Locale locale) {
        return new FaqView(
                doc.id(), doc.question().resolve(locale), doc.answer().resolve(locale), doc.displayOrder());
    }

    public SectionView toView(SectionDocument doc, Locale locale) {
        var items = doc.items() == null
                ? java.util.List.<SectionItemView>of()
                : doc.items().stream()
                        .map(i -> new SectionItemView(
                                i.key(),
                                i.icon(),
                                i.title().resolve(locale),
                                i.body().resolve(locale)))
                        .toList();
        return new SectionView(
                doc.eyebrow().resolve(locale),
                doc.heading().resolve(locale),
                doc.subheading().resolve(locale),
                doc.body().resolve(locale),
                items,
                null);
    }

    public SiteSettingsView toView(SiteSettingsDocument doc, Locale locale) {
        var address = new AddressView(
                doc.address().street(),
                doc.address().district(),
                doc.address().city(),
                doc.address().country());
        return new SiteSettingsView(
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
