package net.jojoaddison.abofonsa.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Enforces the {@code mustChangePassword} gate (spec §8.2, plan.md task 40): while an access
 * token carries the {@code pwdChange} claim, every admin call except the auth endpoints and the
 * password-change endpoint itself is refused with an explanatory 403 problem.
 */
@Component
public class MustChangePasswordFilter extends OncePerRequestFilter {

    private static final String CHANGE_PASSWORD_PATH = "/api/v1/admin/account/change-password";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof JwtAuthenticationToken jwtAuth
                && Boolean.TRUE.equals(jwtAuth.getToken().getClaim(SecurityUtils.PASSWORD_CHANGE_REQUIRED_KEY))
                && requiresCompletedPassword(request.getRequestURI())) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            response.getWriter()
                    .write("{\"type\":\"https://www.abofonsa.com/problems/change-password-required\","
                            + "\"title\":\"Password change required\","
                            + "\"status\":403,"
                            + "\"detail\":\"The bootstrap password must be changed before any other action.\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }

    private static boolean requiresCompletedPassword(String path) {
        return path.startsWith("/api/v1/admin")
                && !path.startsWith("/api/v1/admin/auth")
                && !path.equals(CHANGE_PASSWORD_PATH);
    }
}
