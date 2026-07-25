package net.jojoaddison.abofonsa.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.CsrfConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;

/**
 * Public content/i18n/locales/health and enquiry submission are unauthenticated; everything under
 * {@code /api/v1/admin/**} requires authentication (spec §7.7). No JWT decoder is configured yet
 * (Phase 5 builds admin login/JWT issuance) — until then, {@code authenticated()} routes correctly
 * reject every request with 401, since there is no mechanism to authenticate at all. That is the
 * desired behaviour, not a gap: admin endpoints stay inert rather than open.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfiguration {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http.csrf(CsrfConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth.requestMatchers(
                                HttpMethod.GET,
                                "/api/v1/content/**",
                                "/api/v1/i18n/**",
                                "/api/v1/locales",
                                "/api/v1/health",
                                "/actuator/health/**")
                        .permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/enquiries")
                        .permitAll()
                        .requestMatchers("/api/v1/admin/auth/login", "/api/v1/admin/auth/refresh")
                        .permitAll()
                        .requestMatchers("/api/v1/admin/**")
                        .authenticated()
                        .anyRequest()
                        .denyAll())
                .headers(headers -> headers.contentSecurityPolicy(
                                csp -> csp.policyDirectives(SecurityHeaders.CONTENT_SECURITY_POLICY))
                        .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true))
                        .referrerPolicy(referrer -> referrer.policy(
                                ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)))
                .build();
    }
}
