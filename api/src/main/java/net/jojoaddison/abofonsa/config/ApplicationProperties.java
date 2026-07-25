package net.jojoaddison.abofonsa.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Typed access to the {@code abofonsa.*} configuration block (JHipster's ApplicationProperties
 * convention). Only the enquiry settings are bound here so far; other {@code abofonsa.*} keys
 * still read via {@code @Value} migrate in as their phases land.
 */
@ConfigurationProperties(prefix = "abofonsa", ignoreUnknownFields = true)
public record ApplicationProperties(Enquiry enquiry, Security security) {

    public ApplicationProperties {
        enquiry = enquiry == null ? new Enquiry(null, null, null, null) : enquiry;
        security = security == null ? new Security(null) : security;
    }

    public record Security(Jwt jwt) {

        public Security {
            jwt = jwt == null ? new Jwt(null, null, null) : jwt;
        }
    }

    public record Jwt(String issuer, java.time.Duration accessTokenTtl, java.time.Duration refreshTokenTtl) {

        public Jwt {
            issuer = issuer == null || issuer.isBlank() ? "https://www.abofonsa.com" : issuer;
            accessTokenTtl = accessTokenTtl == null ? java.time.Duration.ofMinutes(30) : accessTokenTtl;
            refreshTokenTtl = refreshTokenTtl == null ? java.time.Duration.ofDays(14) : refreshTokenTtl;
        }
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
