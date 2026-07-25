package net.jojoaddison.abofonsa.web.rest;

import static org.assertj.core.api.Assertions.assertThat;

import net.jojoaddison.abofonsa.AbstractIntegrationTest;
import net.jojoaddison.abofonsa.service.dto.SiteContentDTO;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class ContentResourceTest extends AbstractIntegrationTest {

    @ParameterizedTest
    @ValueSource(strings = {"en", "es", "fr", "de"})
    void siteEndpointReturnsFullPayloadForEveryLocale(String locale) {
        var result = restClient
                .get()
                .uri("/api/v1/content/site?locale=" + locale)
                .exchange()
                .expectStatus()
                .isOk()
                .expectHeader()
                .valueEquals("Cache-Control", "max-age=300, public")
                .expectBody(SiteContentDTO.class)
                .returnResult()
                .getResponseBody();

        assertThat(result).isNotNull();
        assertThat(result.locale()).isEqualTo(locale);
        assertThat(result.siteSettings().organisationName()).isEqualTo("Abofonsa BridgeCare");
        assertThat(result.sections()).hasSize(7);
        assertThat(result.services()).hasSize(6);
        assertThat(result.plans()).hasSize(3);
        assertThat(result.testimonials()).hasSize(4);
        assertThat(result.faqs()).hasSize(7);
    }

    @ParameterizedTest
    @ValueSource(strings = {"en", "es", "fr", "de"})
    void planPricesAreFormattedNotRawNumbers(String locale) {
        var plans = restClient
                .get()
                .uri("/api/v1/content/plans?locale=" + locale)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(net.jojoaddison.abofonsa.service.dto.PlanDTO[].class)
                .returnResult()
                .getResponseBody();

        assertThat(plans).isNotNull().hasSize(3);
        assertThat(plans).allSatisfy(p -> {
            assertThat(p.priceCurrency()).isEqualTo("GHS");
            // No fractional part - "3,000" (en) / "3.000" (es, de) / "3 000" (fr), never "...,00"
            // or "...00.00" (spec §10.5's PlanDTO example: "3.000", not "3.000,00").
            assertThat(p.priceAmount()).doesNotMatch(".*[.,]\\d{2}$");
        });
        assertThat(plans)
                .filteredOn(net.jojoaddison.abofonsa.service.dto.PlanDTO::featured)
                .hasSize(1);
    }

    @org.junit.jupiter.api.Test
    void servicesEndpointReturnsAllSixInDisplayOrder() {
        var services = restClient
                .get()
                .uri("/api/v1/content/services?locale=en")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(net.jojoaddison.abofonsa.service.dto.CareServiceDTO[].class)
                .returnResult()
                .getResponseBody();

        assertThat(services).isNotNull().hasSize(6);
        assertThat(services[0].displayOrder()).isEqualTo(1);
        assertThat(services[5].displayOrder()).isEqualTo(6);
    }

    @org.junit.jupiter.api.Test
    void faqsEndpointReturnsAllSeven() {
        restClient
                .get()
                .uri("/api/v1/content/faqs?locale=en")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(net.jojoaddison.abofonsa.service.dto.FaqDTO[].class)
                .value(faqs -> assertThat(faqs).hasSize(7));
    }

    @org.junit.jupiter.api.Test
    void unsupportedLocaleReturns400() {
        restClient
                .get()
                .uri("/api/v1/content/site?locale=it")
                .exchange()
                .expectStatus()
                .isBadRequest();
    }

    @org.junit.jupiter.api.Test
    void localesEndpointReturnsFourEntries() {
        restClient
                .get()
                .uri("/api/v1/locales")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.length()")
                .isEqualTo(4);
    }

    @org.junit.jupiter.api.Test
    void i18nOverridesEndpointReturnsEmptyMapWhenNoneStored() {
        restClient
                .get()
                .uri("/api/v1/i18n/en.json")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .json("{}");
    }
}
