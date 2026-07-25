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
 * Plan tasks 42-50 over real HTTP with real tokens. Every mutating test restores the seeded
 * baseline before finishing — the Mongo container is shared across all test classes in the JVM,
 * and the public-content tests assert exact seed counts.
 */
class ContentAdminResourceTest extends AbstractIntegrationTest {

    private String editorToken;
    private String publisherToken;

    @BeforeEach
    void tokens() {
        editorToken = accessTokenFor("cms-editor", "correct-horse-battery", AdminRole.EDITOR);
        publisherToken = accessTokenFor("cms-publisher", "correct-horse-battery", AdminRole.PUBLISHER);
    }

    private Map<String, Object> localized(String en) {
        return Map.of("en", en, "es", en + " (es)", "fr", en + " (fr)", "de", en + " (de)");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> createFaq(String question) {
        return restClient
                .post()
                .uri("/api/v1/admin/content/faqs")
                .header("Authorization", "Bearer " + editorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "question",
                        localized(question),
                        "answer",
                        localized("An answer to " + question),
                        "category",
                        "PLANS",
                        "displayOrder",
                        99))
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody(Map.class)
                .returnResult()
                .getResponseBody();
    }

    private void archive(String type, String id) {
        restClient
                .delete()
                .uri("/api/v1/admin/content/" + type + "/" + id)
                .header("Authorization", "Bearer " + publisherToken)
                .exchange()
                .expectStatus()
                .isNoContent();
    }

    @Test
    void listReturnsAllSeededServicesWithPerLocaleCompleteness() {
        var list = restClient
                .get()
                .uri("/api/v1/admin/content/services")
                .header("Authorization", "Bearer " + editorToken)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(Map[].class)
                .returnResult()
                .getResponseBody();

        assertThat(list).hasSizeGreaterThanOrEqualTo(6);
        @SuppressWarnings("unchecked")
        var completeness = (Map<String, Number>) list[0].get("completeness");
        assertThat(completeness.get("en").doubleValue()).isEqualTo(1.0);
        assertThat(completeness).containsKeys("es", "fr", "de");
    }

    @Test
    void createIsDraftUpdateWritesImmutableRevisionsAndStaleVersionGets409() {
        var created = createFaq("What is the revision test?");
        var id = (String) created.get("id");
        assertThat(created.get("status")).isEqualTo("DRAFT");

        // Update with the current version (0).
        @SuppressWarnings("unchecked")
        var document = new java.util.HashMap<String, Object>((Map<String, Object>) created.get("document"));
        document.put("question", localized("What is the UPDATED revision test?"));
        document.put("version", 0);
        restClient
                .put()
                .uri("/api/v1/admin/content/faqs/" + id)
                .header("Authorization", "Bearer " + editorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(document)
                .exchange()
                .expectStatus()
                .isOk();

        // Two revisions; the first snapshot still carries the original wording (E-5).
        var revisions = restClient
                .get()
                .uri("/api/v1/admin/content/faqs/" + id + "/revisions")
                .header("Authorization", "Bearer " + editorToken)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(Map[].class)
                .returnResult()
                .getResponseBody();
        assertThat(revisions).hasSize(2);
        @SuppressWarnings("unchecked")
        var firstSnapshot = (Map<String, Object>) revisions[1].get("snapshot");
        @SuppressWarnings("unchecked")
        var firstQuestion = (Map<String, String>) firstSnapshot.get("question");
        assertThat(firstQuestion.get("en")).isEqualTo("What is the revision test?");

        // A second writer holding the stale version 0 loses with 409 + current state (E-9).
        document.put("question", localized("A competing edit"));
        document.put("version", 0);
        restClient
                .put()
                .uri("/api/v1/admin/content/faqs/" + id)
                .header("Authorization", "Bearer " + editorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(document)
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.currentVersion")
                .isEqualTo(1);

        archive("faqs", id);
    }

    @Test
    void publishingIncompleteEnglishIsRefusedWith422AndFieldList() {
        // The services JSON Schema only mandates name.en - a blurb without English passes the
        // insert but must block publication (E-6).
        @SuppressWarnings("unchecked")
        var created = (Map<String, Object>) restClient
                .post()
                .uri("/api/v1/admin/content/services")
                .header("Authorization", "Bearer " + editorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "slug",
                        "incomplete-english-service",
                        "name",
                        localized("Incomplete English service"),
                        "blurb",
                        Map.of("es", "Solo español"),
                        "displayOrder",
                        98))
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody(Map.class)
                .returnResult()
                .getResponseBody();
        var id = (String) created.get("id");

        restClient
                .post()
                .uri("/api/v1/admin/content/services/" + id + "/publish")
                .header("Authorization", "Bearer " + publisherToken)
                .exchange()
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.fields[0]")
                .isEqualTo("blurb");

        archive("services", id);
    }

    @Test
    void publishMakesContentPublicImmediatelyAndArchiveRemovesIt() {
        var created = createFaq("Will this appear publicly?");
        var id = (String) created.get("id");

        int publicBefore = publicFaqCount();

        restClient
                .post()
                .uri("/api/v1/admin/content/faqs/" + id + "/publish")
                .header("Authorization", "Bearer " + publisherToken)
                .exchange()
                .expectStatus()
                .isNoContent();
        // The cache was evicted on publish - the public payload reflects it on the next request.
        assertThat(publicFaqCount()).isEqualTo(publicBefore + 1);

        archive("faqs", id);
        assertThat(publicFaqCount()).isEqualTo(publicBefore);
    }

    @Test
    void testimonialWithoutConsentCannotBePublished() {
        @SuppressWarnings("unchecked")
        var created = (Map<String, Object>) restClient
                .post()
                .uri("/api/v1/admin/content/testimonials")
                .header("Authorization", "Bearer " + editorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "quote", localized("A wonderful testimonial"),
                        "personName", "Test Person",
                        "personRole", localized("Tester"),
                        "planLabel", localized("PEAR Plan"),
                        "rating", 5,
                        "consent", Map.of("obtained", false),
                        "displayOrder", 99))
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody(Map.class)
                .returnResult()
                .getResponseBody();
        var id = (String) created.get("id");

        // Spec §11.3 journey 6: publish without consent -> 409, entity stays DRAFT.
        restClient
                .post()
                .uri("/api/v1/admin/content/testimonials/" + id + "/publish")
                .header("Authorization", "Bearer " + publisherToken)
                .exchange()
                .expectStatus()
                .isEqualTo(409);
        @SuppressWarnings("unchecked")
        var after = (Map<String, Object>) restClient
                .get()
                .uri("/api/v1/admin/content/testimonials/" + id)
                .header("Authorization", "Bearer " + editorToken)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(Map.class)
                .returnResult()
                .getResponseBody();
        assertThat(after.get("status")).isEqualTo("DRAFT");

        archive("testimonials", id);
    }

    @Test
    void aSecondFeaturedPlanCannotBePublished() {
        // PAWPAW is seeded featured+published. Flip PEAR to featured and try to publish it.
        var plans = restClient
                .get()
                .uri("/api/v1/admin/content/plans")
                .header("Authorization", "Bearer " + editorToken)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(Map[].class)
                .returnResult()
                .getResponseBody();
        @SuppressWarnings("unchecked")
        var pear = java.util.Arrays.stream(plans)
                .map(p -> (Map<String, Object>) p.get("document"))
                .filter(d -> "PEAR".equals(d.get("code")))
                .findFirst()
                .orElseThrow();
        var pearId = (String) pear.get("_id");
        var pearVersion = ((Number) pear.getOrDefault("version", 0)).longValue();

        var body = new java.util.HashMap<String, Object>(pear);
        body.put("featured", true);
        body.put("version", pearVersion);
        restClient
                .put()
                .uri("/api/v1/admin/content/plans/" + pearId)
                .header("Authorization", "Bearer " + editorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange()
                .expectStatus()
                .isOk();

        restClient
                .post()
                .uri("/api/v1/admin/content/plans/" + pearId + "/publish")
                .header("Authorization", "Bearer " + publisherToken)
                .exchange()
                .expectStatus()
                .isEqualTo(409);

        // Restore baseline: featured back to false, and re-publish (it was published as seeded).
        body.put("featured", false);
        body.put("version", pearVersion + 1);
        restClient
                .put()
                .uri("/api/v1/admin/content/plans/" + pearId)
                .header("Authorization", "Bearer " + editorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange()
                .expectStatus()
                .isOk();
        restClient
                .post()
                .uri("/api/v1/admin/content/plans/" + pearId + "/publish")
                .header("Authorization", "Bearer " + publisherToken)
                .exchange()
                .expectStatus()
                .isNoContent();
    }

    @Test
    void restoreRollsThePublicSiteBack() {
        // Journey 8: create+publish, edit+publish, restore revision 1 -> the original text is
        // publicly visible again.
        var created = createFaq("Original rollback question?");
        var id = (String) created.get("id");
        publish("faqs", id);

        @SuppressWarnings("unchecked")
        var document = new java.util.HashMap<String, Object>((Map<String, Object>) created.get("document"));
        document.put("question", localized("Edited rollback question?"));
        document.put("version", 0);
        restClient
                .put()
                .uri("/api/v1/admin/content/faqs/" + id)
                .header("Authorization", "Bearer " + editorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(document)
                .exchange()
                .expectStatus()
                .isOk();
        publish("faqs", id);
        assertThat(publicFaqQuestions()).contains("Edited rollback question?");

        restClient
                .post()
                .uri("/api/v1/admin/content/faqs/" + id + "/revisions/1/restore")
                .header("Authorization", "Bearer " + publisherToken)
                .exchange()
                .expectStatus()
                .isNoContent();
        assertThat(publicFaqQuestions())
                .contains("Original rollback question?")
                .doesNotContain("Edited rollback question?");

        archive("faqs", id);
    }

    @Test
    void reorderChangesThePublicOrder() {
        var services = restClient
                .get()
                .uri("/api/v1/admin/content/services")
                .header("Authorization", "Bearer " + editorToken)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(Map[].class)
                .returnResult()
                .getResponseBody();
        var ids =
                java.util.Arrays.stream(services).map(s -> (String) s.get("id")).toList();

        var reversed = new java.util.ArrayList<>(ids);
        java.util.Collections.reverse(reversed);
        restClient
                .post()
                .uri("/api/v1/admin/content/services/reorder")
                .header("Authorization", "Bearer " + editorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(reversed)
                .exchange()
                .expectStatus()
                .isNoContent();

        var publicFirst = firstPublicServiceSlug();
        // Restore the original order before asserting, so a failure cannot poison other tests.
        restClient
                .post()
                .uri("/api/v1/admin/content/services/reorder")
                .header("Authorization", "Bearer " + editorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(ids)
                .exchange()
                .expectStatus()
                .isNoContent();

        assertThat(publicFirst).isEqualTo("daily-living-auxiliary-services");
        assertThat(firstPublicServiceSlug()).isEqualTo("elderly-companion-care");
    }

    private void publish(String type, String id) {
        restClient
                .post()
                .uri("/api/v1/admin/content/" + type + "/" + id + "/publish")
                .header("Authorization", "Bearer " + publisherToken)
                .exchange()
                .expectStatus()
                .isNoContent();
    }

    private int publicFaqCount() {
        var faqs = restClient
                .get()
                .uri("/api/v1/content/faqs?locale=en")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(Map[].class)
                .returnResult()
                .getResponseBody();
        return faqs.length;
    }

    private List<String> publicFaqQuestions() {
        var faqs = restClient
                .get()
                .uri("/api/v1/content/faqs?locale=en")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(Map[].class)
                .returnResult()
                .getResponseBody();
        return java.util.Arrays.stream(faqs)
                .map(f -> (String) f.get("question"))
                .toList();
    }

    private String firstPublicServiceSlug() {
        var services = restClient
                .get()
                .uri("/api/v1/content/services?locale=en")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(Map[].class)
                .returnResult()
                .getResponseBody();
        return (String) services[0].get("slug");
    }
}
