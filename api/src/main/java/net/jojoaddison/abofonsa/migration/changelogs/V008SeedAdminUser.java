package net.jojoaddison.abofonsa.migration.changelogs;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import net.jojoaddison.abofonsa.identity.AdminUserDocument;
import net.jojoaddison.abofonsa.identity.AdminUserDocument.Role;
import net.jojoaddison.abofonsa.migration.Changelog;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Bootstrap ADMIN account, {@code mustChangePassword: true} (spec §8.5). The password is supplied
 * by the {@code BOOTSTRAP_ADMIN_PASSWORD} environment variable (see application.yml) and is never
 * a literal here — only its BCrypt hash is persisted.
 */
@Component
public class V008SeedAdminUser implements Changelog {

    private static final Logger log = LoggerFactory.getLogger(V008SeedAdminUser.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final String configuredPassword;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);

    public V008SeedAdminUser(@Value("${abofonsa.admin.bootstrap-password:}") String configuredPassword) {
        this.configuredPassword = configuredPassword;
    }

    @Override
    public String id() {
        return "V008_seed_admin_user";
    }

    @Override
    public void execute(MongoTemplate mongoTemplate) {
        var password = configuredPassword.isBlank() ? generateAndLogRandomPassword() : configuredPassword;

        var admin = new AdminUserDocument(
                null,
                1,
                "admin",
                "admin@abofonsa.com",
                "Bootstrap Administrator",
                passwordEncoder.encode(password),
                List.of(Role.ADMIN),
                List.of(),
                true,
                0,
                null,
                null,
                true,
                Instant.now(),
                "system");

        mongoTemplate.insert(admin);
    }

    private String generateAndLogRandomPassword() {
        var bytes = new byte[18];
        RANDOM.nextBytes(bytes);
        var generated = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        log.warn(
                "BOOTSTRAP_ADMIN_PASSWORD was not set - generated a random bootstrap password for the 'admin'"
                        + " account: {}. It must be changed on first login (mustChangePassword=true); this is"
                        + " logged once and not stored in plaintext anywhere.",
                generated);
        return generated;
    }
}
