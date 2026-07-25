package net.jojoaddison.abofonsa.web.rest;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import net.jojoaddison.abofonsa.AbstractIntegrationTest;
import net.jojoaddison.abofonsa.domain.AuditLog;
import net.jojoaddison.abofonsa.domain.enumeration.AdminRole;
import net.jojoaddison.abofonsa.domain.enumeration.AuditAction;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.MediaType;

class AuthenticateControllerTest extends AbstractIntegrationTest {

    /** The per-IP lockout window counts LOGIN_FAILED audit entries; every test in the JVM shares
     * one client IP, so each test must clear its own failures or later logins would be locked. */
    @AfterEach
    void clearFailedLoginAudit() {
        mongoTemplate.remove(Query.query(Criteria.where("action").is(AuditAction.LOGIN_FAILED.name())), AuditLog.class);
    }

    @Test
    void validLoginReturnsAccessAndRefreshTokens() {
        givenUser("editor1", "correct-horse-battery", AdminRole.EDITOR);
        var tokens = login("editor1", "correct-horse-battery");
        assertThat((String) tokens.get("accessToken")).isNotBlank();
        assertThat((String) tokens.get("refreshToken")).isNotBlank();
        assertThat(tokens.get("mustChangePassword")).isEqualTo(false);
    }

    @Test
    void wrongPasswordReturns401() {
        givenUser("editor2", "correct-horse-battery", AdminRole.EDITOR);
        restClient
                .post()
                .uri("/api/v1/admin/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("username", "editor2", "password", "wrong"))
                .exchange()
                .expectStatus()
                .isUnauthorized();
    }

    @Test
    void afterFiveFailuresTheCorrectPasswordIsStillRejected() {
        givenUser("locky", "correct-horse-battery", AdminRole.EDITOR);
        for (int i = 0; i < 5; i++) {
            restClient
                    .post()
                    .uri("/api/v1/admin/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("username", "locky", "password", "wrong-" + i))
                    .exchange()
                    .expectStatus()
                    .isUnauthorized();
        }
        // Sixth attempt with the CORRECT password - still 401, the account is locked (task 37).
        restClient
                .post()
                .uri("/api/v1/admin/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("username", "locky", "password", "correct-horse-battery"))
                .exchange()
                .expectStatus()
                .isUnauthorized();
    }

    @Test
    void refreshRotatesAndAReplayedTokenRevokesTheChain() {
        givenUser("rotator", "correct-horse-battery", AdminRole.VIEWER);
        var first = login("rotator", "correct-horse-battery");
        var oldRefresh = (String) first.get("refreshToken");

        var second = restClient
                .post()
                .uri("/api/v1/admin/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("refreshToken", oldRefresh))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(Map.class)
                .returnResult()
                .getResponseBody();
        var newRefresh = (String) second.get("refreshToken");
        assertThat(newRefresh).isNotEqualTo(oldRefresh);

        // Replaying the rotated token is rejected...
        restClient
                .post()
                .uri("/api/v1/admin/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("refreshToken", oldRefresh))
                .exchange()
                .expectStatus()
                .isUnauthorized();
        // ...and treated as theft: the whole chain, including the newest token, is revoked.
        restClient
                .post()
                .uri("/api/v1/admin/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("refreshToken", newRefresh))
                .exchange()
                .expectStatus()
                .isUnauthorized();
    }

    @Test
    void logoutRevokesTheRefreshToken() {
        givenUser("leaver", "correct-horse-battery", AdminRole.VIEWER);
        var tokens = login("leaver", "correct-horse-battery");
        var refresh = (String) tokens.get("refreshToken");

        // Logout is an authenticated endpoint (spec §7.5 role "any") - the bearer token rides along.
        restClient
                .post()
                .uri("/api/v1/admin/auth/logout")
                .header("Authorization", "Bearer " + tokens.get("accessToken"))
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("refreshToken", refresh))
                .exchange()
                .expectStatus()
                .isNoContent();

        restClient
                .post()
                .uri("/api/v1/admin/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("refreshToken", refresh))
                .exchange()
                .expectStatus()
                .isUnauthorized();
    }
}
