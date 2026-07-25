package net.jojoaddison.abofonsa.web.rest;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import net.jojoaddison.abofonsa.AbstractIntegrationTest;
import net.jojoaddison.abofonsa.domain.enumeration.AdminRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/**
 * Plan tasks 54-55. The test classpath ships fixture bundles (4 keys; French deliberately
 * missing two) shadowing the real ones, so the coverage assertions are exact.
 */
@SuppressWarnings("unchecked")
class I18nAdminResourceTest extends AbstractIntegrationTest {

    private String editorToken;

    @BeforeEach
    void tokens() {
        editorToken = accessTokenFor("i18n-editor", "correct-horse-battery", AdminRole.EDITOR);
    }

    @Test
    void overrideAppearsInThePublicBundleAndDeleteRevertsToTheDefault() {
        // PUT an override (T-3 - writes to uiTranslationOverrides, not the JSON file)...
        restClient
                .put()
                .uri("/api/v1/admin/i18n/en")
                .header("Authorization", "Bearer " + editorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("nav.pricing", "Fees & plans"))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.overrides['nav.pricing']")
                .isEqualTo("Fees & plans")
                .jsonPath("$.defaults['nav.pricing']")
                .isEqualTo("Plans and pricing");

        // ...the cache was evicted, so the public bundle reflects it immediately (§10.3)...
        restClient
                .get()
                .uri("/api/v1/i18n/en.json")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$['nav.pricing']")
                .isEqualTo("Fees & plans");

        // ...and deleting reverts to the shipped default (T-4).
        restClient
                .delete()
                .uri("/api/v1/admin/i18n/en/nav.pricing")
                .header("Authorization", "Bearer " + editorToken)
                .exchange()
                .expectStatus()
                .isOk();
        restClient
                .get()
                .uri("/api/v1/i18n/en.json")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .json("{}");
    }

    @Test
    void coverageReportsTheMissingFrenchKeysExactly() {
        var coverage = restClient
                .get()
                .uri("/api/v1/admin/i18n/coverage")
                .header("Authorization", "Bearer " + editorToken)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(Map[].class)
                .returnResult()
                .getResponseBody();

        assertThat(coverage).hasSize(4);
        var byLocale = java.util.Arrays.stream(coverage)
                .collect(java.util.stream.Collectors.toMap(c -> (String) c.get("locale"), c -> c));

        assertThat((List<?>) byLocale.get("en").get("missingUiKeys")).isEmpty();
        assertThat((List<String>) byLocale.get("fr").get("missingUiKeys")).containsExactly("a11y.skip", "form.submit");
        assertThat(((Number) byLocale.get("fr").get("totalUiKeys")).intValue()).isEqualTo(4);
        // Seeded content is fully translated, so completeness sits near 1.0 for every locale.
        assertThat(((Number) byLocale.get("es").get("contentCompleteness")).doubleValue())
                .isGreaterThan(0.8);
    }

    @Test
    void unknownUiKeyIsRejected() {
        restClient
                .put()
                .uri("/api/v1/admin/i18n/en")
                .header("Authorization", "Bearer " + editorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("no.such.key", "value"))
                .exchange()
                .expectStatus()
                .isNotFound();
    }

    @Test
    void viewersCanReadButNotWriteOverrides() {
        var viewerToken = accessTokenFor("i18n-viewer", "correct-horse-battery", AdminRole.VIEWER);
        restClient
                .get()
                .uri("/api/v1/admin/i18n/de")
                .header("Authorization", "Bearer " + viewerToken)
                .exchange()
                .expectStatus()
                .isOk();
        restClient
                .put()
                .uri("/api/v1/admin/i18n/de")
                .header("Authorization", "Bearer " + viewerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("nav.home", "Heim"))
                .exchange()
                .expectStatus()
                .isForbidden();
    }
}
