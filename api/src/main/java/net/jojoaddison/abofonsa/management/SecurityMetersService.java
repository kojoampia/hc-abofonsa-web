package net.jojoaddison.abofonsa.management;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Service;

/** Micrometer counters for JWT decode failures (hc-admin-gw / JHipster shape). */
@Service
public class SecurityMetersService {

    public static final String INVALID_TOKENS_METER_NAME = "security.authentication.invalid-tokens";
    public static final String INVALID_TOKENS_METER_DESCRIPTION =
            "Indicates validation error count of the tokens presented to the endpoints.";

    private final Counter tokenInvalidSignatureCounter;
    private final Counter tokenExpiredCounter;
    private final Counter tokenMalformedCounter;

    public SecurityMetersService(MeterRegistry registry) {
        this.tokenInvalidSignatureCounter = invalidTokensCounterForCauseBuilder(registry, "invalid-signature");
        this.tokenExpiredCounter = invalidTokensCounterForCauseBuilder(registry, "expired");
        this.tokenMalformedCounter = invalidTokensCounterForCauseBuilder(registry, "malformed");
    }

    private Counter invalidTokensCounterForCauseBuilder(MeterRegistry registry, String cause) {
        return Counter.builder(INVALID_TOKENS_METER_NAME)
                .baseUnit("errors")
                .description(INVALID_TOKENS_METER_DESCRIPTION)
                .tag("cause", cause)
                .register(registry);
    }

    public void trackTokenInvalidSignature() {
        this.tokenInvalidSignatureCounter.increment();
    }

    public void trackTokenExpired() {
        this.tokenExpiredCounter.increment();
    }

    public void trackTokenMalformed() {
        this.tokenMalformedCounter.increment();
    }
}
