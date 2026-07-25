package net.jojoaddison.abofonsa.web.rest;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import net.jojoaddison.abofonsa.AbstractIntegrationTest;
import net.jojoaddison.abofonsa.domain.enumeration.AdminRole;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/**
 * Plan.md task 39: role enforcement happens at the service/method level, not only route matching
 * — an EDITOR token on an ADMIN-only operation is 403 even though the route exists — and the
 * ADMIN > PUBLISHER > EDITOR > VIEWER hierarchy grants each role its subordinates' reads.
 */
class AdminAuthorizationTest extends AbstractIntegrationTest {

    @Test
    void viewerCanListEnquiriesButCannotPatch() {
        var viewerToken = accessTokenFor("authz-viewer", "correct-horse-battery", AdminRole.VIEWER);

        restClient
                .get()
                .uri("/api/v1/admin/enquiries")
                .header("Authorization", "Bearer " + viewerToken)
                .exchange()
                .expectStatus()
                .isOk();

        restClient
                .patch()
                .uri("/api/v1/admin/enquiries/some-id")
                .header("Authorization", "Bearer " + viewerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("status", "CONTACTED"))
                .exchange()
                .expectStatus()
                .isForbidden();
    }

    @Test
    void editorInheritsViewerReadsButCannotDelete() {
        var editorToken = accessTokenFor("authz-editor", "correct-horse-battery", AdminRole.EDITOR);

        // Hierarchy: EDITOR satisfies hasRole('VIEWER').
        restClient
                .get()
                .uri("/api/v1/admin/enquiries")
                .header("Authorization", "Bearer " + editorToken)
                .exchange()
                .expectStatus()
                .isOk();

        // But DELETE is ADMIN-only - 403 despite the route matching (task 39).
        restClient
                .delete()
                .uri("/api/v1/admin/enquiries/some-id")
                .header("Authorization", "Bearer " + editorToken)
                .exchange()
                .expectStatus()
                .isForbidden();
    }

    @Test
    void auditTrailIsAdminOnly() {
        var publisherToken = accessTokenFor("authz-publisher", "correct-horse-battery", AdminRole.PUBLISHER);
        restClient
                .get()
                .uri("/api/v1/admin/audit")
                .header("Authorization", "Bearer " + publisherToken)
                .exchange()
                .expectStatus()
                .isForbidden();

        var adminToken = accessTokenFor("authz-admin", "correct-horse-battery", AdminRole.ADMIN);
        var entries = restClient
                .get()
                .uri("/api/v1/admin/audit")
                .header("Authorization", "Bearer " + adminToken)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(Map[].class)
                .returnResult()
                .getResponseBody();
        // At minimum this test class's own LOGIN_SUCCESS entries are present.
        assertThat(entries).anyMatch(e -> "LOGIN_SUCCESS".equals(e.get("action")));
    }

    @Test
    void anonymousAdminRequestIs401() {
        restClient
                .get()
                .uri("/api/v1/admin/enquiries")
                .exchange()
                .expectStatus()
                .isUnauthorized();
    }
}
