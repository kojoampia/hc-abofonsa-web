package net.jojoaddison.abofonsa.identity;

import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.common.Locale;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A CMS user (spec §8.2 {@code adminUsers}). Only the document shape lands in Phase 2 — enough for
 * {@code V008_seed_admin_user} to bootstrap the first account; the login/JWT/lockout logic that
 * reads and writes it is Phase 5's {@code identity} package.
 */
@Document(collection = "adminUsers")
public record AdminUserDocument(
        @Id String id,
        int schemaVersion,
        String username,
        String email,
        String displayName,
        String passwordHash,
        List<Role> roles,
        /** Empty = all locales (spec §8.2 — a translator scoped to one locale can't touch the rest). */
        List<Locale> localeScope,
        boolean active,
        int failedLoginAttempts,
        Instant lockedUntil,
        Instant lastLoginAt,
        boolean mustChangePassword,
        Instant createdAt,
        String createdBy) {

    public enum Role {
        VIEWER,
        EDITOR,
        PUBLISHER,
        ADMIN
    }
}
