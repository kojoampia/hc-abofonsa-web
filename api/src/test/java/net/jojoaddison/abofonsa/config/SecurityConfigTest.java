package net.jojoaddison.abofonsa.config;

import static org.assertj.core.api.Assertions.assertThat;

import net.jojoaddison.abofonsa.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;

/** Verifies spec §7.7/§13.2's security posture: public routes open, admin routes closed, and the
 * exact CSP value present — the plan.md Phase 3 acceptance criteria for tasks 27-28. */
class SecurityConfigTest extends AbstractIntegrationTest {

    @Test
    void adminRouteWithNoTokenIsRejected() {
        restClient
                .get()
                .uri("/api/v1/admin/content/services")
                .exchange()
                .expectStatus()
                .is4xxClientError();
    }

    @Test
    void publicRouteSetsNoCookies() {
        var result = restClient
                .get()
                .uri("/api/v1/content/site?locale=en")
                .exchange()
                .expectStatus()
                .isOk()
                .returnResult();
        assertThat(result.getResponseHeaders().get("Set-Cookie")).isNull();
    }

    @Test
    void everyResponseCarriesTheExactContentSecurityPolicy() {
        restClient
                .get()
                .uri("/api/v1/health")
                .exchange()
                .expectHeader()
                .valueEquals(
                        "Content-Security-Policy",
                        "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src"
                                + " 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action"
                                + " 'self'");
    }

    // HSTS itself isn't asserted here: Spring Security's HstsHeaderWriter only writes the header
    // over a secure (HTTPS) request by design (RFC 6797) - this test server runs plain HTTP, so
    // the header is correctly absent, not testable at this layer. `includeSubDomains(true)` in
    // SecurityConfig is exercised for real once TLS terminates in front of this app (Phase 20's
    // nginx/Certbot setup).
}
