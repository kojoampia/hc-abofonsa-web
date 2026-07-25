package net.jojoaddison.abofonsa.security;

import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;

/** Utility class for Spring Security (servlet counterpart of hc-admin-gw's reactive version). */
public final class SecurityUtils {

    public static final MacAlgorithm JWT_ALGORITHM = MacAlgorithm.HS512;

    public static final String AUTHORITIES_KEY = "auth";

    /** Claim set on access tokens issued while the account still must change its password. */
    public static final String PASSWORD_CHANGE_REQUIRED_KEY = "pwdChange";

    private SecurityUtils() {}

    /** Get the login of the current user, if any. */
    public static Optional<String> getCurrentUserLogin() {
        return Optional.ofNullable(
                extractPrincipal(SecurityContextHolder.getContext().getAuthentication()));
    }

    private static String extractPrincipal(Authentication authentication) {
        if (authentication == null) {
            return null;
        } else if (authentication.getPrincipal() instanceof UserDetails springSecurityUser) {
            return springSecurityUser.getUsername();
        } else if (authentication.getPrincipal() instanceof Jwt jwt) {
            return jwt.getSubject();
        } else if (authentication.getPrincipal() instanceof String s) {
            return s;
        }
        return null;
    }
}
