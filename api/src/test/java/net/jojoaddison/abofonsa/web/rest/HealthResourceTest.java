package net.jojoaddison.abofonsa.web.rest;

import net.jojoaddison.abofonsa.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class HealthResourceTest extends AbstractIntegrationTest {

    @Test
    void healthEndpointIsPublicAndReturnsUp() {
        restClient
                .get()
                .uri("/api/v1/health")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(String.class)
                .value(body -> org.assertj.core.api.Assertions.assertThat(body).contains("\"status\":\"UP\""));
    }

    @Test
    void healthEndpointReturnsJson() {
        restClient
                .get()
                .uri("/api/v1/health")
                .accept(MediaType.APPLICATION_JSON)
                .exchange()
                .expectStatus()
                .isOk()
                .expectHeader()
                .contentType(MediaType.APPLICATION_JSON);
    }
}
