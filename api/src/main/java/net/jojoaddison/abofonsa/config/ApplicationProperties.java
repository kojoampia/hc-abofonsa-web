package net.jojoaddison.abofonsa.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Typed access to the {@code abofonsa.*} configuration block (JHipster's ApplicationProperties
 * convention). Only the enquiry settings are bound here so far; other {@code abofonsa.*} keys
 * still read via {@code @Value} migrate in as their phases land.
 */
@ConfigurationProperties(prefix = "abofonsa", ignoreUnknownFields = true)
public record ApplicationProperties(Enquiry enquiry) {

    public ApplicationProperties {
        enquiry = enquiry == null ? new Enquiry(null, null, null, null) : enquiry;
    }

    public record Enquiry(RateLimit rateLimit, String ipSalt, Integer retentionMonths, Long minDwellMs) {

        public Enquiry {
            rateLimit = rateLimit == null ? new RateLimit(null) : rateLimit;
            ipSalt = ipSalt == null || ipSalt.isBlank() ? "dev-only-ip-salt" : ipSalt;
            retentionMonths = retentionMonths == null ? 24 : retentionMonths;
            minDwellMs = minDwellMs == null ? 3000L : minDwellMs;
        }
    }

    public record RateLimit(Integer perHourPerIp) {

        public RateLimit {
            perHourPerIp = perHourPerIp == null ? 5 : perHourPerIp;
        }
    }
}
