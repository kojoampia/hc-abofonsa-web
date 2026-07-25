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
 * The spec §11.3 journeys not already covered by a dedicated test (plan task 57): journey 3
 * (no authentication anywhere on the public surface), journey 4 (editorial round trip in
 * Spanish), journey 5 (translation fallback to English). Journeys 1-2 are browser journeys
 * (Phase 16 Playwright); 6-8 live in ContentAdminResourceTest; 7 in EnquiryResourceTest.
 */
class Spec113JourneysTest extends AbstractIntegrationTest {

    private String publisherToken;

    @BeforeEach
    void tokens() {
        publisherToken = accessTokenFor("journey-publisher", "correct-horse-battery", AdminRole.PUBLISHER);
    }

    /** Journey 3 (guards R8): every public route responds without authentication, offers no
     * challenge, and sets no cookie of any kind — the functional locale cookie is written by the
     * frontend, never by this API. */
    @Test
    void publicSurfaceRequiresNoAuthenticationAndSetsNoCookies() {
        var publicRoutes = List.of(
                "/api/v1/content/site?locale=en",
                "/api/v1/content/site?locale=es",
                "/api/v1/content/services?locale=fr",
                "/api/v1/content/plans?locale=de",
                "/api/v1/content/faqs?locale=en",
                "/api/v1/i18n/en.json",
                "/api/v1/locales",
                "/api/v1/health");
        for (var route : publicRoutes) {
            var result =
                    restClient.get().uri(route).exchange().expectStatus().isOk().returnResult();
            assertThat(result.getResponseHeaders().get("Set-Cookie"))
                    .as("no Set-Cookie on %s", route)
                    .isNull();
            assertThat(result.getResponseHeaders().getFirst("WWW-Authenticate"))
                    .as("no auth challenge on %s", route)
                    .isNull();
        }
    }

    /** Journey 4: a staff member edits the Spanish blurb of a service, saves, publishes — the
     * public Spanish payload carries the new text on the very next request. */
    @Test
    @SuppressWarnings("unchecked")
    void editorialRoundTripInSpanish() {
        var created = (Map<String, Object>) restClient
                .post()
                .uri("/api/v1/admin/content/services")
                .header("Authorization", "Bearer " + publisherToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "slug",
                        "journey4-service",
                        "name",
                        Map.of("en", "Journey 4 service", "es", "Servicio jornada 4"),
                        "blurb",
                        Map.of("en", "Original English blurb", "es", "Texto original"),
                        "displayOrder",
                        96))
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody(Map.class)
                .returnResult()
                .getResponseBody();
        var id = (String) created.get("id");
        publish(id);

        // Edit the Spanish blurb (save = new revision), publish, and re-read the public payload.
        var document = new java.util.HashMap<String, Object>((Map<String, Object>) created.get("document"));
        document.put("blurb", Map.of("en", "Original English blurb", "es", "Texto revisado por la editora"));
        document.put("version", 0);
        restClient
                .put()
                .uri("/api/v1/admin/content/services/" + id)
                .header("Authorization", "Bearer " + publisherToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(document)
                .exchange()
                .expectStatus()
                .isOk();
        publish(id);

        assertThat(publicServiceBlurbs("es")).contains("Texto revisado por la editora");

        archive(id);
    }

    /** Journey 5: a missing German field falls back to English on the public German page — never
     * an empty element, never a raw key. */
    @Test
    @SuppressWarnings("unchecked")
    void translationFallbackShowsEnglishNotEmptiness() {
        var created = (Map<String, Object>) restClient
                .post()
                .uri("/api/v1/admin/content/services")
                .header("Authorization", "Bearer " + publisherToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "slug",
                        "journey5-service",
                        "name",
                        Map.of("en", "Journey 5 service"), // deliberately no German
                        "blurb",
                        Map.of("en", "English-only blurb"),
                        "displayOrder",
                        95))
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody(Map.class)
                .returnResult()
                .getResponseBody();
        var id = (String) created.get("id");
        publish(id);

        var germanBlurbs = publicServiceBlurbs("de");
        assertThat(germanBlurbs).contains("English-only blurb");
        assertThat(germanBlurbs).doesNotContain("").doesNotContainNull();

        archive(id);
    }

    private void publish(String id) {
        restClient
                .post()
                .uri("/api/v1/admin/content/services/" + id + "/publish")
                .header("Authorization", "Bearer " + publisherToken)
                .exchange()
                .expectStatus()
                .isNoContent();
    }

    private void archive(String id) {
        restClient
                .delete()
                .uri("/api/v1/admin/content/services/" + id)
                .header("Authorization", "Bearer " + publisherToken)
                .exchange()
                .expectStatus()
                .isNoContent();
    }

    private List<String> publicServiceBlurbs(String locale) {
        var services = restClient
                .get()
                .uri("/api/v1/content/services?locale=" + locale)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(Map[].class)
                .returnResult()
                .getResponseBody();
        return java.util.Arrays.stream(services)
                .map(s -> (String) s.get("blurb"))
                .toList();
    }
}
