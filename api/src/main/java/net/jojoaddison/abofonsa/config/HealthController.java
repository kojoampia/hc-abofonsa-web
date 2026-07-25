package net.jojoaddison.abofonsa.config;

import java.time.Instant;
import java.util.Map;
import org.springframework.boot.health.actuate.endpoint.HealthEndpoint;
import org.springframework.boot.health.contributor.Status;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public, unauthenticated liveness/readiness check (spec §7.4) — a stable API-versioned surface
 * for external uptime monitors and the Docker healthcheck, distinct from the richer
 * {@code /actuator/health} (Actuator-secured, used internally per spec §12.3/§13.5).
 *
 * <p>Note: Spring Boot 4.1 relocated the health SPI from {@code org.springframework.boot.actuate.health}
 * (the spec's original package reference, current through Boot 3.x) to
 * {@code org.springframework.boot.health.*} — this class uses the actual 4.1 packages.
 */
@RestController
public class HealthController {

    private final HealthEndpoint healthEndpoint;

    public HealthController(HealthEndpoint healthEndpoint) {
        this.healthEndpoint = healthEndpoint;
    }

    @GetMapping("/api/v1/health")
    public ResponseEntity<Map<String, Object>> health() {
        var status = healthEndpoint.health().getStatus();
        var body = Map.<String, Object>of(
                "status", status.getCode(),
                "timestamp", Instant.now().toString());
        return status.equals(Status.UP)
                ? ResponseEntity.ok(body)
                : ResponseEntity.status(503).body(body);
    }
}
