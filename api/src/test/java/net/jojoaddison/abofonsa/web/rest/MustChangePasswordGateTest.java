package net.jojoaddison.abofonsa.web.rest;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import net.jojoaddison.abofonsa.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/**
 * Plan.md task 40, full journey against the V008-seeded bootstrap admin (password from
 * application-test.yml): first login flags {@code mustChangePassword}, every other admin call is
 * 403 with an explanatory problem until the password change succeeds, then access works.
 */
class MustChangePasswordGateTest extends AbstractIntegrationTest {

    private static final String BOOTSTRAP_PASSWORD = "test-bootstrap-password-00";
    private static final String NEW_PASSWORD = "a-much-better-password-123";

    @Test
    void bootstrapAdminIsGatedUntilThePasswordIsChanged() {
        var tokens = login("admin", BOOTSTRAP_PASSWORD);
        assertThat(tokens.get("mustChangePassword")).isEqualTo(true);
        var gatedToken = (String) tokens.get("accessToken");

        // Any admin call except auth/change-password is refused with the specific problem type.
        restClient
                .get()
                .uri("/api/v1/admin/enquiries")
                .header("Authorization", "Bearer " + gatedToken)
                .exchange()
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("https://www.abofonsa.com/problems/change-password-required");

        // The change-password endpoint itself is allowed through the gate.
        restClient
                .post()
                .uri("/api/v1/admin/account/change-password")
                .header("Authorization", "Bearer " + gatedToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("currentPassword", BOOTSTRAP_PASSWORD, "newPassword", NEW_PASSWORD))
                .exchange()
                .expectStatus()
                .isNoContent();

        // A fresh login with the new password is no longer gated and admin calls succeed.
        var fresh = login("admin", NEW_PASSWORD);
        assertThat(fresh.get("mustChangePassword")).isEqualTo(false);
        restClient
                .get()
                .uri("/api/v1/admin/enquiries")
                .header("Authorization", "Bearer " + (String) fresh.get("accessToken"))
                .exchange()
                .expectStatus()
                .isOk();

        // The old password no longer works.
        restClient
                .post()
                .uri("/api/v1/admin/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("username", "admin", "password", BOOTSTRAP_PASSWORD))
                .exchange()
                .expectStatus()
                .isUnauthorized();
    }
}
