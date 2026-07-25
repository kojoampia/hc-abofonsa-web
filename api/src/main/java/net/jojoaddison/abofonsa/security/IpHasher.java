package net.jojoaddison.abofonsa.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import net.jojoaddison.abofonsa.config.ApplicationProperties;
import org.springframework.stereotype.Component;

/** Salted SHA-256 of a client IP, {@code sha256:}-prefixed (spec §8.2) — the raw address is
 * never persisted anywhere. Shared by enquiry rate limiting and login-attempt tracking. */
@Component
public class IpHasher {

    private final String salt;

    public IpHasher(ApplicationProperties properties) {
        this.salt = properties.enquiry().ipSalt();
    }

    public String hash(String clientIp) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            var salted = salt + ":" + clientIp;
            return "sha256:" + HexFormat.of().formatHex(digest.digest(salted.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
