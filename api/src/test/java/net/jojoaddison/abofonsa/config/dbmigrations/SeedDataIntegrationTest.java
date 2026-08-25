package net.jojoaddison.abofonsa.config.dbmigrations;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import net.jojoaddison.abofonsa.AbstractIntegrationTest;
import net.jojoaddison.abofonsa.domain.AdminUser;
import net.jojoaddison.abofonsa.domain.enumeration.AdminRole;
import net.jojoaddison.abofonsa.domain.enumeration.FaqCategory;
import net.jojoaddison.abofonsa.repository.CareServiceRepository;
import net.jojoaddison.abofonsa.repository.FaqRepository;
import net.jojoaddison.abofonsa.repository.PlanRepository;
import net.jojoaddison.abofonsa.repository.SectionRepository;
import net.jojoaddison.abofonsa.repository.SiteSettingsRepository;
import net.jojoaddison.abofonsa.repository.TestimonialRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;

/**
 * Verifies the whole changelog chain (V001–V008) ran on startup and produced exactly the seed
 * data spec §8.5/Appendix B describes — the plan.md Phase 2 acceptance criteria for tasks 12–19,
 * all in one place since they share the same startup.
 *
 * <p><b>This class runs against its own database.</b> Every assertion here is of the form "the
 * seeded collection contains exactly this", which is only true of a database nothing else has
 * written to — and {@link AbstractIntegrationTest} deliberately shares one container, one JVM-wide,
 * across every integration test class with no reset between them. So whether this class passed
 * depended on whether it happened to run before the classes that create services, FAQs,
 * testimonials, career tracks and admin users. It ran first locally and later in CI, which is why
 * CI was red on five of these while the same commit was green on a developer's machine.
 *
 * <p>Answered by isolation rather than by weakening the assertions. "Six services, exactly" is the
 * claim worth making — rewriting it as "the six seeded slugs are among those present" would keep the
 * build green while no longer noticing a changelog that seeds something twice, which is precisely
 * what this class exists to catch. Pointing {@code spring.mongodb.uri} at a database of its own
 * gives this class its own Spring context, so the changelog chain runs from empty into a database
 * with exactly one writer.
 *
 * <p>It therefore does <b>not</b> extend {@link AbstractIntegrationTest}, and that is deliberate
 * rather than untidy: a subclass cannot win this argument. Spring applies
 * {@code @DynamicPropertySource} methods from the subclass first and the superclass last, so the
 * base class's registration for the same key overwrites the subclass's and the test quietly keeps
 * using the shared database — which is exactly what was tried first, and it changed nothing. The
 * container is still shared, because starting a second one would cost far more than the one extra
 * application context this does cost.
 */
@ExtendWith(SpringExtension.class)
@SpringBootTest
@ActiveProfiles("test")
class SeedDataIntegrationTest {

    @DynamicPropertySource
    static void ownDatabase(DynamicPropertyRegistry registry) {
        // Same container as every other integration test, different database inside it.
        registry.add("spring.mongodb.uri", () -> AbstractIntegrationTest.MONGO.getReplicaSetUrl("seed-data-isolated"));
    }

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
    private net.jojoaddison.abofonsa.repository.CareerTrackRepository careerTrackRepository;

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

    /** Seven family FAQs on the home page, plus six careers questions the careers page selects by
     * category. Asserted separately, because the split is the point: a careers question appearing
     * among the family FAQs is the bug the payload separation exists to prevent. */
    @Test
    void sevenFamilyFaqsAndSixCareersFaqsSeeded() {
        var faqs = faqRepository.findAll();
        assertThat(faqs.stream().filter(f -> f.category() != FaqCategory.CAREERS))
                .hasSize(7);
        assertThat(faqs.stream().filter(f -> f.category() == FaqCategory.CAREERS))
                .hasSize(6);
    }

    @Test
    void oneSectionPerKeyAcrossBothPages() {
        var sections = sectionRepository.findAll();
        // Seven home-page sections + four careers ones, each key used exactly once.
        assertThat(sections).hasSize(11);
        assertThat(sections.stream().map(s -> s.key()).distinct()).hasSize(11);
        assertThat(sections.stream().filter(s -> s.key().name().startsWith("CAREERS_")))
                .hasSize(4);
    }

    @Test
    void everyCareerTrackCarriesAnAuthorityRoleAndItsDocumentList() {
        var tracks = careerTrackRepository.findAll();
        assertThat(tracks).hasSize(6);
        assertThat(tracks).allSatisfy(track -> {
            assertThat(track.authorityRole()).isNotNull();
            // The document list is what keeps applicants out of returned_for_correction, so an
            // empty one would defeat the point of the page (careers-plan.md §1).
            assertThat(track.documents()).isNotEmpty();
        });
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
