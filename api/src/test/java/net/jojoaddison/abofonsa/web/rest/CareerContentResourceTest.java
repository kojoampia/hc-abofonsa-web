package net.jojoaddison.abofonsa.web.rest;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import net.jojoaddison.abofonsa.AbstractIntegrationTest;
import net.jojoaddison.abofonsa.domain.enumeration.AdminRole;
import net.jojoaddison.abofonsa.service.dto.CareersContentDTO;
import net.jojoaddison.abofonsa.service.dto.SiteContentDTO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;

/** Plan tasks 131 and 133 — the careers payload (careers-plan.md Phase C1). */
class CareerContentResourceTest extends AbstractIntegrationTest {

    private CareersContentDTO careers(String locale) {
        return restClient
                .get()
                .uri("/api/v1/content/careers?locale=" + locale)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(CareersContentDTO.class)
                .returnResult()
                .getResponseBody();
    }

    @Test
    void theCareersPayloadCarriesEveryTrackWithItsAuthorityRole() {
        var result = careers("en");

        assertThat(result).isNotNull();
        assertThat(result.tracks()).hasSize(6);
        // The authority role is what the handoff link carries, so a track without one would send a
        // candidate to professional.abofonsa.com with no idea which role they chose.
        assertThat(result.tracks()).allSatisfy(track -> {
            assertThat(track.authorityRole()).startsWith("ROLE_");
            assertThat(track.title()).isNotBlank();
            assertThat(track.documents()).isNotEmpty();
            assertThat(track.requirements()).isNotEmpty();
        });
        assertThat(result.tracks().stream().map(t -> t.authorityRole()))
                .containsExactlyInAnyOrder(
                        "ROLE_NURSE",
                        "ROLE_CARER",
                        "ROLE_DOCTOR",
                        "ROLE_PARAMEDIC",
                        "ROLE_PHARMACIST",
                        "ROLE_THERAPIST");
    }

    /**
     * Task 133. Three of the six tracks are advertised ahead of their rota (careers-plan.md D-2).
     * They must still be served — a track that disappears looks like a broken link to anyone who
     * bookmarked it — but flagged, so the page can say "we are building this team" rather than
     * implying a vacancy that cannot be filled.
     */
    @Test
    void tracksWithoutOpeningsAreStillServed_flaggedRatherThanHidden() {
        var tracks = careers("en").tracks();

        assertThat(tracks.stream().filter(t -> t.openings()).map(t -> t.slug()))
                .containsExactlyInAnyOrder("registered-nurse", "care-assistant", "visiting-physician");
        assertThat(tracks.stream().filter(t -> !t.openings()).map(t -> t.slug()))
                .containsExactlyInAnyOrder("paramedic", "pharmacist", "therapist");
    }

    @Test
    void theFourCareersSectionsAreServedUnderCamelCaseKeys() {
        var sections = careers("en").sections();

        assertThat(sections.keySet())
                .containsExactlyInAnyOrder("careersHero", "careersLife", "careersProcess", "careersCta");
        assertThat(sections.get("careersProcess").items()).hasSize(4);
    }

    /**
     * The careers content is English-only by decision (careers-plan.md D-5). Requesting another
     * locale must fall back to English rather than returning blanks — the same rule every other
     * translated field follows.
     */
    @ParameterizedTest
    @ValueSource(strings = {"es", "fr", "de"})
    void anUntranslatedLocaleFallsBackToEnglishRatherThanEmptiness(String locale) {
        var result = careers(locale);

        assertThat(result.locale()).isEqualTo(locale);
        assertThat(result.tracks())
                .allSatisfy(track -> assertThat(track.title()).isNotBlank());
        assertThat(result.sections().values())
                .allSatisfy(section -> assertThat(section.heading()).isNotBlank());
        assertThat(result.faqs()).allSatisfy(faq -> assertThat(faq.question()).isNotBlank());
    }

    /**
     * The other half of that fallback, and the part nothing else would notice.
     *
     * <p>Falling back to English is correct; serving it without saying so is not. The page wraps
     * itself in {@code <html lang="es">}, and English prose inside that is a WCAG 2.2 AA failure
     * under 3.1.2 — a screen reader applies Spanish pronunciation to English words. axe-core cannot
     * catch it, because checking whether text matches its declared language means reading the text.
     * So the payload states the language it actually served and the client marks the difference.
     */
    @ParameterizedTest
    @ValueSource(strings = {"es", "fr", "de"})
    void anUntranslatedLocaleReportsThatItServedEnglish(String locale) {
        var result = careers(locale);

        assertThat(result.locale()).isEqualTo(locale);
        assertThat(result.contentLanguage())
                .as("careers copy is seeded English-only (D-5); the payload must admit it")
                .isEqualTo("en");
    }

    @Test
    void anEnglishRequestReportsEnglishAndNeedsNoMarkup() {
        var result = careers("en");
        assertThat(result.contentLanguage()).isEqualTo("en");
        assertThat(result.contentLanguage()).isEqualTo(result.locale());
    }

    // It must also stop saying "en" once the content really is translated, or the attribute becomes
    // permanent and mislabels Spanish copy as English the day someone writes it. Translating all
    // sixteen seeded entities through the admin API to prove that is not worth the runtime, so the
    // rule itself is driven in CareersContentLanguageTest.

    /**
     * The reason the payloads are split. FaqDTO has no category and the home accordion renders its
     * list as-is, so a careers question left in the site payload would show up among the family
     * FAQs — and every home-page visitor would download careers content they never see.
     */
    @Test
    void careersContentNeverLeaksIntoTheHomePagePayload() {
        var site = restClient
                .get()
                .uri("/api/v1/content/site?locale=en")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(SiteContentDTO.class)
                .returnResult()
                .getResponseBody();

        assertThat(site).isNotNull();
        assertThat(site.sections().keySet()).noneMatch(key -> key.startsWith("careers"));
        assertThat(site.faqs()).noneMatch(faq -> faq.question().contains("apply"));
        // The home page's own content is untouched by any of this.
        assertThat(site.sections()).hasSize(7);
        assertThat(site.faqs()).hasSize(7);
    }

    /**
     * Task 144. The apply buttons are switched by the presence of a portal URL, and the <em>seed</em>
     * leaves it absent: a database created from scratch cannot know whether the far side is
     * answering, and a button to a dead host costs more than an absent one on a page that has just
     * asked someone to gather a licence and a Ghana Card.
     *
     * <p>Production is a different matter — an editor set the field there once the portal started
     * serving (task 147) and the buttons are live. What this pins is the default, because it is the
     * safe state and safe states are the ones nobody notices regressing. The page still carries every
     * track either way, so what is withheld is the promise of a door, not the reason to walk through
     * it.
     */
    @Test
    void theProfessionalPortalIsUnconfiguredUntilItIsActuallyDeployed() {
        var site = restClient
                .get()
                .uri("/api/v1/content/site?locale=en")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(SiteContentDTO.class)
                .returnResult()
                .getResponseBody();

        assertThat(site).isNotNull();
        assertThat(site.siteSettings().professionalPortalUrl())
                .as("careers apply buttons must stay hidden until the portal serves (task 144)")
                .isNull();
        assertThat(site.siteSettings().professionalInvitationUrl()).isNull();
        // ...while the content behind those buttons is fully present.
        assertThat(careers("en").tracks()).hasSize(6);
    }

    /**
     * The switch has to be operable, or gating on it is worse than not gating at all.
     *
     * <p>This failed the first time it was tried. {@code siteSettings} carried no {@code version}
     * field, and the admin update matches on {@code {_id, version}} — so every settings write
     * modified zero documents, fell into the conflict branch, and 500ed there on a
     * {@code Map.of(..., null)}. The CMS settings screen had never been saved by any test, only
     * read, so nothing noticed that it could not save.
     */
    @Test
    void anEditorCanTurnTheCareersApplyButtonsOnAndOffThroughTheCms() {
        var editorToken = accessTokenFor("settings-editor", "correct-horse-battery", AdminRole.EDITOR);
        var settings = restClient
                .get()
                .uri("/api/v1/admin/content/settings")
                .header("Authorization", "Bearer " + editorToken)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(java.util.List.class)
                .returnResult()
                .getResponseBody();

        assertThat(settings).isNotNull().hasSize(1);
        @SuppressWarnings("unchecked")
        var entry = (Map<String, Object>) settings.get(0);
        @SuppressWarnings("unchecked")
        var document = new java.util.HashMap<String, Object>((Map<String, Object>) entry.get("document"));
        assertThat(document.get("version"))
                .as("without a version the document can never be updated")
                .isNotNull();

        document.put("professionalPortalUrl", "https://professional.abofonsa.com");
        restClient
                .put()
                .uri("/api/v1/admin/content/settings/" + entry.get("id"))
                .header("Authorization", "Bearer " + editorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(document)
                .exchange()
                .expectStatus()
                .isOk();

        restClient
                .post()
                .uri("/api/v1/admin/content/settings/" + entry.get("id") + "/publish")
                .header(
                        "Authorization",
                        "Bearer " + accessTokenFor("settings-publisher", "correct-horse-battery", AdminRole.PUBLISHER))
                .exchange()
                .expectStatus()
                .is2xxSuccessful();

        assertThat(publishedSettings().professionalPortalUrl()).isEqualTo("https://professional.abofonsa.com");

        // ...and off again. Both because "on and off" is the claim, and because leaving it on would
        // hand the next test a site that advertises a dead portal — which is precisely how a career
        // track once stayed flipped to "recruiting" and reached a visual baseline.
        var reread = restClient
                .get()
                .uri("/api/v1/admin/content/settings/" + entry.get("id"))
                .header("Authorization", "Bearer " + editorToken)
                .exchange()
                .expectBody(Map.class)
                .returnResult()
                .getResponseBody();
        @SuppressWarnings("unchecked")
        var latest = new java.util.HashMap<String, Object>((Map<String, Object>) reread.get("document"));
        latest.put("professionalPortalUrl", null);
        restClient
                .put()
                .uri("/api/v1/admin/content/settings/" + entry.get("id"))
                .header("Authorization", "Bearer " + editorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(latest)
                .exchange()
                .expectStatus()
                .isOk();
        // Publishing is what evicts the cached public payload; a saved-but-unpublished change is
        // invisible by design (spec §9.5), which also means withdrawing the buttons is a publish.
        restClient
                .post()
                .uri("/api/v1/admin/content/settings/" + entry.get("id") + "/publish")
                .header(
                        "Authorization",
                        "Bearer " + accessTokenFor("settings-publisher", "correct-horse-battery", AdminRole.PUBLISHER))
                .exchange()
                .expectStatus()
                .is2xxSuccessful();

        assertThat(publishedSettings().professionalPortalUrl())
                .as("clearing the URL must take the apply buttons away again")
                .isNull();
    }

    private net.jojoaddison.abofonsa.service.dto.SiteSettingsDTO publishedSettings() {
        var site = restClient
                .get()
                .uri("/api/v1/content/site?locale=en")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(SiteContentDTO.class)
                .returnResult()
                .getResponseBody();
        assertThat(site).isNotNull();
        return site.siteSettings();
    }

    /** Task 132's server side: the CMS addresses the new type at /admin/content/career-tracks. */
    @Test
    void theAdminApiExposesCareerTracksAsItsOwnContentType() {
        var editorToken = accessTokenFor("careers-editor", "correct-horse-battery", AdminRole.EDITOR);

        restClient
                .get()
                .uri("/api/v1/admin/content/career-tracks")
                .header("Authorization", "Bearer " + editorToken)
                .exchange()
                .expectStatus()
                .isOk();

        var created = restClient
                .post()
                .uri("/api/v1/admin/content/career-tracks")
                .header("Authorization", "Bearer " + editorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "slug",
                        "career-track-admin-test",
                        "title",
                        Map.of("en", "Admin test track"),
                        "authorityRole",
                        "ROLE_NURSE",
                        "openings",
                        false,
                        "displayOrder",
                        90))
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody(Map.class)
                .returnResult()
                .getResponseBody();

        assertThat(created).isNotNull();
        // Created as a draft, so it is not on the public page until someone publishes it.
        assertThat(created.get("status")).isEqualTo("DRAFT");
        assertThat(careers("en").tracks()).noneMatch(t -> "career-track-admin-test".equals(t.slug()));

        restClient
                .delete()
                .uri("/api/v1/admin/content/career-tracks/" + created.get("id"))
                .header(
                        "Authorization",
                        "Bearer " + accessTokenFor("careers-publisher", "correct-horse-battery", AdminRole.PUBLISHER))
                .exchange()
                .expectStatus()
                .isNoContent();
    }
}
