package net.jojoaddison.abofonsa.web.rest;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.util.Map;
import net.jojoaddison.abofonsa.AbstractIntegrationTest;
import net.jojoaddison.abofonsa.repository.EnquiryRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

class EnquiryResourceTest extends AbstractIntegrationTest {

    @Autowired
    private EnquiryRepository enquiryRepository;

    private ListAppender<ILoggingEvent> logCapture;

    @BeforeEach
    void captureLogs() {
        enquiryRepository.deleteAll();
        logCapture = new ListAppender<>();
        logCapture.start();
        ((Logger) LoggerFactory.getLogger("net.jojoaddison.abofonsa")).addAppender(logCapture);
    }

    @AfterEach
    void stopCapture() {
        ((Logger) LoggerFactory.getLogger("net.jojoaddison.abofonsa")).detachAppender(logCapture);
    }

    private Map<String, Object> validPayload() {
        return Map.of(
                "name", "Kwame Asare",
                "phone", "+233 24 000 0000",
                "email", "kwame@example.com",
                "planOfInterest", "PAWPAW",
                "message", "My mother has diabetes and needs daily support",
                "locale", "en",
                "sourcePage", "/#pricing",
                "consent", true,
                "dwellMs", 8000);
    }

    @Test
    void validSubmissionReturns201WithQuotableReferenceAndPersists() {
        var body = restClient
                .post()
                .uri("/api/v1/enquiries")
                .contentType(MediaType.APPLICATION_JSON)
                .body(validPayload())
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody(Map.class)
                .returnResult()
                .getResponseBody();

        assertThat(body).isNotNull();
        var reference = (String) body.get("reference");
        assertThat(reference).matches("ENQ-\\d{4}-\\d{6}");

        var saved = enquiryRepository.findByReference(reference).orElseThrow();
        assertThat(saved.status().name()).isEqualTo("NEW");
        // Raw IP is never stored - only the salted hash (spec §8.2/§13.3).
        assertThat(saved.meta().ipHash()).startsWith("sha256:").doesNotContain("127.0.0.1");
        // Retention lands ~24 months out (spec §13.3).
        assertThat(saved.retentionExpiresAt()).isAfter(saved.createdAt().plusSeconds(60L * 60 * 24 * 700));
    }

    @Test
    void sensitiveMessageContentNeverAppearsInLogs() {
        restClient
                .post()
                .uri("/api/v1/enquiries")
                .contentType(MediaType.APPLICATION_JSON)
                .body(validPayload())
                .exchange()
                .expectStatus()
                .isCreated();

        assertThat(logCapture.list)
                .noneMatch(event -> event.getFormattedMessage().contains("diabetes")
                        || event.getFormattedMessage().contains("Kwame")
                        || event.getFormattedMessage().contains("kwame@example.com"));
    }

    @Test
    void invalidPhoneAndEmailReturn400WithFieldErrors() {
        var payload = Map.of(
                "name", "X",
                "phone", "abc",
                "email", "not-an-email",
                "consent", true,
                "dwellMs", 8000);
        restClient
                .post()
                .uri("/api/v1/enquiries")
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.errors")
                .exists();
    }

    @Test
    void missingConsentReturns400() {
        var payload = Map.of("name", "Kwame", "phone", "+233 24 000 0000", "dwellMs", 8000, "consent", false);
        restClient
                .post()
                .uri("/api/v1/enquiries")
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .exchange()
                .expectStatus()
                .isBadRequest();
    }

    @Test
    void honeypotFilledIsRejectedWithGenericProblem() {
        var payload = new java.util.HashMap<String, Object>(validPayload());
        payload.put("company", "Totally Real Business Ltd");
        restClient
                .post()
                .uri("/api/v1/enquiries")
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.title")
                .isEqualTo("Submission rejected")
                // The problem body must not explain which rule fired (spec §7.7).
                .jsonPath("$.detail")
                .doesNotExist();
        assertThat(enquiryRepository.count()).isZero();
    }

    @Test
    void tooFastSubmissionIsRejected() {
        var payload = new java.util.HashMap<String, Object>(validPayload());
        payload.put("dwellMs", 300);
        restClient
                .post()
                .uri("/api/v1/enquiries")
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .exchange()
                .expectStatus()
                .isBadRequest();
        assertThat(enquiryRepository.count()).isZero();
    }

    @Test
    void sixthSubmissionWithinAnHourFromOneIpIsRejectedWith429() {
        for (int i = 0; i < 5; i++) {
            restClient
                    .post()
                    .uri("/api/v1/enquiries")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(validPayload())
                    .exchange()
                    .expectStatus()
                    .isCreated();
        }
        restClient
                .post()
                .uri("/api/v1/enquiries")
                .contentType(MediaType.APPLICATION_JSON)
                .body(validPayload())
                .exchange()
                .expectStatus()
                .isEqualTo(429);
        assertThat(enquiryRepository.count()).isEqualTo(5);
    }
}
