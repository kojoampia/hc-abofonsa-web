package net.jojoaddison.abofonsa.config;

import net.jojoaddison.abofonsa.security.MustChangePasswordFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.access.hierarchicalroles.RoleHierarchyImpl;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.CsrfConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;

/**
 * The spec §7.7 security posture with JWT wiring per hc-admin-gw's shape: public content/i18n/
 * locales/health and enquiry submission open; {@code /api/v1/admin/**} JWT-authenticated with the
 * role hierarchy ADMIN > PUBLISHER > EDITOR > VIEWER (spec §9.1's cumulative permissions) and
 * method-level {@code @PreAuthorize} rules on the resources.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfiguration {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12); // spec §7.7
    }

    @Bean
    public AuthenticationManager authenticationManager(
            UserDetailsService userDetailsService, PasswordEncoder passwordEncoder) {
        var provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return new ProviderManager(provider);
    }

    @Bean
    public RoleHierarchy roleHierarchy() {
        return RoleHierarchyImpl.fromHierarchy("""
                ROLE_ADMIN > ROLE_PUBLISHER
                ROLE_PUBLISHER > ROLE_EDITOR
                ROLE_EDITOR > ROLE_VIEWER
                """);
    }

    @Bean
    SecurityFilterChain filterChain(
            HttpSecurity http,
            JwtAuthenticationConverter jwtAuthenticationConverter,
            MustChangePasswordFilter mustChangePasswordFilter)
            throws Exception {
        return http.csrf(CsrfConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth.requestMatchers(
                                HttpMethod.GET,
                                "/api/v1/content/**",
                                "/api/v1/i18n/**",
                                "/api/v1/locales",
                                "/api/v1/health",
                                "/actuator/health/**",
                                // Uploaded images are public site content — they are referenced by
                                // published pages and must load for anonymous visitors. Without
                                // this they fell through to anyRequest().denyAll() and every image
                                // on the site answered 401.
                                "/media/**")
                        .permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/enquiries")
                        .permitAll()
                        .requestMatchers("/api/v1/admin/auth/login", "/api/v1/admin/auth/refresh")
                        .permitAll()
                        .requestMatchers("/api/v1/admin/**")
                        .authenticated()
                        .anyRequest()
                        .denyAll())
                .oauth2ResourceServer(
                        oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter)))
                .addFilterAfter(mustChangePasswordFilter, BasicAuthenticationFilter.class)
                .headers(headers -> headers.contentSecurityPolicy(
                                csp -> csp.policyDirectives(SecurityHeaders.CONTENT_SECURITY_POLICY))
                        .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true))
                        .referrerPolicy(referrer -> referrer.policy(
                                ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)))
                .build();
    }
}
