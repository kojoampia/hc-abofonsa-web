package net.jojoaddison.abofonsa.service;

import static net.jojoaddison.abofonsa.security.SecurityUtils.AUTHORITIES_KEY;
import static net.jojoaddison.abofonsa.security.SecurityUtils.JWT_ALGORITHM;
import static net.jojoaddison.abofonsa.security.SecurityUtils.PASSWORD_CHANGE_REQUIRED_KEY;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;
import java.util.stream.Collectors;
import net.jojoaddison.abofonsa.config.ApplicationProperties;
import net.jojoaddison.abofonsa.domain.AdminUser;
import net.jojoaddison.abofonsa.domain.RefreshToken;
import net.jojoaddison.abofonsa.domain.enumeration.AuditAction;
import net.jojoaddison.abofonsa.repository.AdminUserRepository;
import net.jojoaddison.abofonsa.repository.AuditLogRepository;
import net.jojoaddison.abofonsa.repository.RefreshTokenRepository;
import net.jojoaddison.abofonsa.security.IpHasher;
import net.jojoaddison.abofonsa.service.dto.AuthTokensDTO;
import net.jojoaddison.abofonsa.web.rest.errors.InvalidCredentialsException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

/**
 * Login, token rotation and the forced-password-change flow (spec §7.5/§7.7). Token creation
 * follows hc-admin-gw's AuthenticateController (HS512, authorities in the {@code auth} claim);
 * everything around it — refresh rotation, per-username and per-IP lockout, audit — is this
 * project's spec.
 *
 * <p>Every failure path throws the same {@link InvalidCredentialsException} so the API never
 * reveals whether a username exists or an account is locked.
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 15;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final AuthenticationManager authenticationManager;
    private final AdminUserRepository adminUserRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuditLogRepository auditLogRepository;
    private final AuditService auditService;
    private final JwtEncoder jwtEncoder;
    private final PasswordEncoder passwordEncoder;
    private final IpHasher ipHasher;
    private final MongoTemplate mongoTemplate;
    private final ApplicationProperties properties;

    public AuthService(
            AuthenticationManager authenticationManager,
            AdminUserRepository adminUserRepository,
            RefreshTokenRepository refreshTokenRepository,
            AuditLogRepository auditLogRepository,
            AuditService auditService,
            JwtEncoder jwtEncoder,
            PasswordEncoder passwordEncoder,
            IpHasher ipHasher,
            MongoTemplate mongoTemplate,
            ApplicationProperties properties) {
        this.authenticationManager = authenticationManager;
        this.adminUserRepository = adminUserRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.auditLogRepository = auditLogRepository;
        this.auditService = auditService;
        this.jwtEncoder = jwtEncoder;
        this.passwordEncoder = passwordEncoder;
        this.ipHasher = ipHasher;
        this.mongoTemplate = mongoTemplate;
        this.properties = properties;
    }

    public AuthTokensDTO login(String username, String password, String clientIp) {
        var ipHash = ipHasher.hash(clientIp);
        enforceIpLockout(ipHash);

        Authentication authentication;
        try {
            authentication =
                    authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(username, password));
        } catch (BadCredentialsException e) {
            registerFailedAttempt(username, ipHash);
            throw new InvalidCredentialsException("bad credentials for " + username);
        } catch (LockedException e) {
            auditService.record(
                    username, username, AuditAction.LOGIN_FAILED, "USER", null, Map.of("locked", true), ipHash);
            throw new InvalidCredentialsException("account locked: " + username);
        } catch (AuthenticationException e) {
            auditService.record(username, username, AuditAction.LOGIN_FAILED, "USER", null, Map.of(), ipHash);
            throw new InvalidCredentialsException("authentication failed for " + username);
        }

        var user = adminUserRepository.findByUsername(authentication.getName()).orElseThrow();
        mongoTemplate.updateFirst(
                Query.query(Criteria.where("_id").is(user.id())),
                new Update()
                        .set("failedLoginAttempts", 0)
                        .set("lockedUntil", null)
                        .set("lastLoginAt", Instant.now()),
                AdminUser.class);
        auditService.record(
                user.username(), user.displayName(), AuditAction.LOGIN_SUCCESS, "USER", user.id(), Map.of(), ipHash);
        log.info("Login success for {}", user.username());

        return issueTokens(user, authentication);
    }

    public AuthTokensDTO refresh(String rawRefreshToken) {
        var stored = refreshTokenRepository
                .findByTokenHash(hashToken(rawRefreshToken))
                .orElseThrow(() -> new InvalidCredentialsException("unknown refresh token"));
        if (stored.revoked()
                || stored.replacedBy() != null
                || stored.expiresAt().isBefore(Instant.now())) {
            // A rotated token being replayed is a theft signal: revoke the whole chain's user.
            refreshTokenRepository
                    .findByUsernameAndRevokedFalse(stored.username())
                    .forEach(t -> revoke(t, null));
            throw new InvalidCredentialsException("refresh token expired, revoked or reused");
        }
        var user = adminUserRepository
                .findByUsername(stored.username())
                .orElseThrow(() -> new InvalidCredentialsException("user gone"));

        var tokens = issueTokens(user, null);
        revoke(stored, hashToken(tokens.refreshToken()));
        return tokens;
    }

    public void logout(String rawRefreshToken) {
        refreshTokenRepository.findByTokenHash(hashToken(rawRefreshToken)).ifPresent(t -> revoke(t, null));
    }

    public void changePassword(String username, String currentPassword, String newPassword) {
        var user = adminUserRepository
                .findByUsername(username)
                .orElseThrow(() -> new InvalidCredentialsException("user gone"));
        if (!passwordEncoder.matches(currentPassword, user.passwordHash())) {
            throw new InvalidCredentialsException("current password mismatch for " + username);
        }
        mongoTemplate.updateFirst(
                Query.query(Criteria.where("_id").is(user.id())),
                new Update()
                        .set("passwordHash", passwordEncoder.encode(newPassword))
                        .set("mustChangePassword", false)
                        .set("failedLoginAttempts", 0)
                        .set("lockedUntil", null),
                AdminUser.class);
        // Rotating the password invalidates every outstanding refresh token.
        refreshTokenRepository.findByUsernameAndRevokedFalse(username).forEach(t -> revoke(t, null));
        log.info("Password changed for {}", username);
    }

    private AuthTokensDTO issueTokens(AdminUser user, Authentication authentication) {
        var authorities = authentication != null
                ? authentication.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .collect(Collectors.joining(" "))
                : user.roles().stream().map(r -> "ROLE_" + r.name()).collect(Collectors.joining(" "));

        var now = Instant.now();
        var claims = JwtClaimsSet.builder()
                .issuer(properties.security().jwt().issuer())
                .issuedAt(now)
                .expiresAt(now.plus(properties.security().jwt().accessTokenTtl()))
                .subject(user.username())
                .claim(AUTHORITIES_KEY, authorities);
        // Re-read the flag from the store: `user` may be a pre-login snapshot.
        var mustChange = adminUserRepository
                .findByUsername(user.username())
                .map(AdminUser::mustChangePassword)
                .orElse(false);
        if (mustChange) {
            claims.claim(PASSWORD_CHANGE_REQUIRED_KEY, true);
        }
        var jwsHeader = JwsHeader.with(JWT_ALGORITHM).build();
        var accessToken = jwtEncoder
                .encode(JwtEncoderParameters.from(jwsHeader, claims.build()))
                .getTokenValue();

        var rawRefresh = generateRefreshTokenValue();
        refreshTokenRepository.save(new RefreshToken(
                null,
                1,
                user.id(),
                user.username(),
                hashToken(rawRefresh),
                now.plus(properties.security().jwt().refreshTokenTtl()),
                now,
                false,
                null));

        return new AuthTokensDTO(accessToken, rawRefresh, mustChange);
    }

    private void enforceIpLockout(String ipHash) {
        var windowStart = Instant.now().minus(LOCKOUT_MINUTES, ChronoUnit.MINUTES);
        if (auditLogRepository.countByActionAndIpHashAndAtAfter(AuditAction.LOGIN_FAILED, ipHash, windowStart)
                >= MAX_FAILED_ATTEMPTS) {
            throw new InvalidCredentialsException("too many failed attempts from this address");
        }
    }

    private void registerFailedAttempt(String username, String ipHash) {
        adminUserRepository.findByUsername(username).ifPresent(user -> {
            var attempts = user.failedLoginAttempts() + 1;
            var update = new Update().set("failedLoginAttempts", attempts);
            if (attempts >= MAX_FAILED_ATTEMPTS) {
                update.set("lockedUntil", Instant.now().plus(LOCKOUT_MINUTES, ChronoUnit.MINUTES));
            }
            mongoTemplate.updateFirst(Query.query(Criteria.where("_id").is(user.id())), update, AdminUser.class);
        });
        auditService.record(username, username, AuditAction.LOGIN_FAILED, "USER", null, Map.of(), ipHash);
    }

    private void revoke(RefreshToken token, String replacedByHash) {
        mongoTemplate.updateFirst(
                Query.query(Criteria.where("_id").is(token.id())),
                new Update().set("revoked", true).set("replacedBy", replacedByHash),
                RefreshToken.class);
    }

    private static String generateRefreshTokenValue() {
        var bytes = new byte[48];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hashToken(String rawToken) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
