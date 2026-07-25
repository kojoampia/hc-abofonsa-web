package net.jojoaddison.abofonsa.config;

import static net.jojoaddison.abofonsa.security.SecurityUtils.AUTHORITIES_KEY;
import static net.jojoaddison.abofonsa.security.SecurityUtils.JWT_ALGORITHM;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import net.jojoaddison.abofonsa.management.SecurityMetersService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;

/**
 * JWT encode/decode wiring — the servlet counterpart of hc-admin-gw's SecurityJwtConfiguration:
 * one shared HMAC secret, HS512, authorities carried in the {@code auth} claim with no prefix
 * added on read (they are stored as {@code ROLE_*} already).
 *
 * <p>The key is read as raw UTF-8 bytes from {@code abofonsa.security.jwt.signing-key} and must
 * be at least 64 bytes for HS512. The production value comes from the {@code JWT_SIGNING_KEY}
 * environment variable (spec §7.7 — never committed, rotated annually).
 */
@Configuration
public class SecurityJwtConfiguration {

    private final Logger log = LoggerFactory.getLogger(SecurityJwtConfiguration.class);

    @Value("${abofonsa.security.jwt.signing-key}")
    private String jwtKey;

    @Bean
    public JwtDecoder jwtDecoder(SecurityMetersService metersService) {
        NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder.withSecretKey(getSecretKey())
                .macAlgorithm(JWT_ALGORITHM)
                .build();
        return token -> {
            try {
                return jwtDecoder.decode(token);
            } catch (Exception e) {
                var message = String.valueOf(e.getMessage());
                if (message.contains("Jwt expired at")) {
                    metersService.trackTokenExpired();
                } else if (message.contains("Failed to validate the token")) {
                    metersService.trackTokenInvalidSignature();
                } else if (message.contains("Invalid JWT serialization")
                        || message.contains("Malformed token")
                        || message.contains("Invalid unsecured/JWS/JWE header")) {
                    metersService.trackTokenMalformed();
                } else {
                    log.info("JWT decode error: {}", message);
                }
                throw e;
            }
        };
    }

    @Bean
    public JwtEncoder jwtEncoder() {
        return new NimbusJwtEncoder(new ImmutableSecret<>(getSecretKey()));
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter grantedAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();
        grantedAuthoritiesConverter.setAuthorityPrefix("");
        grantedAuthoritiesConverter.setAuthoritiesClaimName(AUTHORITIES_KEY);

        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(grantedAuthoritiesConverter);
        return converter;
    }

    private SecretKey getSecretKey() {
        byte[] keyBytes = jwtKey.getBytes(StandardCharsets.UTF_8);
        return new SecretKeySpec(keyBytes, 0, keyBytes.length, JWT_ALGORITHM.getName());
    }
}
