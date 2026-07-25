package net.jojoaddison.abofonsa.config.dbmigrations;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import net.jojoaddison.abofonsa.AbstractIntegrationTest;
import net.jojoaddison.abofonsa.domain.AdminUser;
import net.jojoaddison.abofonsa.domain.enumeration.AdminRole;
import net.jojoaddison.abofonsa.repository.CareServiceRepository;
import net.jojoaddison.abofonsa.repository.FaqRepository;
import net.jojoaddison.abofonsa.repository.PlanRepository;
import net.jojoaddison.abofonsa.repository.SectionRepository;
import net.jojoaddison.abofonsa.repository.SiteSettingsRepository;
import net.jojoaddison.abofonsa.repository.TestimonialRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;

/**
 * Verifies the whole changelog chain (V001–V008) ran on startup and produced exactly the seed
 * data spec §8.5/Appendix B describes — the plan.md Phase 2 acceptance criteria for tasks 12–19,
 * all in one place since they share the same startup.
 */
class SeedDataIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private java.util.List<Changelog> changelogs;

    @Autowired
    private CareServiceRepository serviceRepository;

    @Autowired
    private PlanRepository planRepository;

    @Autowired
    private TestimonialRepository testimonialRepository;

    @Autowired
    private FaqRepository faqRepository;

    @Autowired
    private SectionRepository sectionRepository;

    @Autowired
    private SiteSettingsRepository siteSettingsRepository;

    @Test
    void allChangelogsRanExactlyOnce() {
        // One MigrationRecord per registered Changelog bean - stays correct as later phases add
        // V0NN changelogs without editing this test.
        assertThat(mongoTemplate.findAll(MigrationRecord.class)).hasSize(changelogs.size());
    }

    @Test
    void sixServicesSeededWithUniqueStableSlugs() {
        var services = serviceRepository.findAll();
        assertThat(services).hasSize(6);
        assertThat(services.stream().map(s -> s.slug()).distinct()).hasSize(6);
    }

    @Test
    void threePlansSeededWithCanonicalPricesAndExactlyOneFeatured() {
        var pear = planRepository.findByCode("PEAR").orElseThrow();
        var pawpaw = planRepository.findByCode("PAWPAW").orElseThrow();
        var melon = planRepository.findByCode("MELON").orElseThrow();

        assertThat(pear.price().amount()).isEqualByComparingTo(new BigDecimal("3000.00"));
        assertThat(pawpaw.price().amount()).isEqualByComparingTo(new BigDecimal("5000.00"));
        assertThat(melon.price().amount()).isEqualByComparingTo(new BigDecimal("8000.00"));

        assertThat(planRepository.findAll().stream().filter(p -> p.featured()).toList())
                .hasSize(1);
        assertThat(pawpaw.featured()).isTrue();
    }

    @Test
    void fourTestimonialsSeededWithConsentObtained() {
        var testimonials = testimonialRepository.findAll();
        assertThat(testimonials).hasSize(4);
        assertThat(testimonials).allMatch(t -> t.consent().obtained());
    }

    @Test
    void sevenFaqsSeeded() {
        assertThat(faqRepository.findAll()).hasSize(7);
    }

    @Test
    void sevenSectionsSeededOnePerKey() {
        var sections = sectionRepository.findAll();
        assertThat(sections).hasSize(7);
        assertThat(sections.stream().map(s -> s.key()).distinct()).hasSize(7);
    }

    @Test
    void siteSettingsSingletonSeeded() {
        var settings = siteSettingsRepository.findTheSettings().orElseThrow();
        assertThat(settings.organisationName()).isEqualTo("Abofonsa BridgeCare");
        assertThat(settings.email()).isEqualTo("info@abofonsa.com");
    }

    @Test
    void bootstrapAdminSeededWithMustChangePassword() {
        var admin = mongoTemplate.findAll(AdminUser.class).stream()
                .filter(u -> u.username().equals("admin"))
                .findFirst()
                .orElseThrow();
        assertThat(admin.mustChangePassword()).isTrue();
        assertThat(admin.roles()).containsExactly(AdminRole.ADMIN);
        assertThat(admin.passwordHash()).doesNotContain("test-bootstrap-password");
    }
}
