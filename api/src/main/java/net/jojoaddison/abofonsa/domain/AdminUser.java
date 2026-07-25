package net.jojoaddison.abofonsa.domain;

import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.domain.enumeration.AdminRole;
import net.jojoaddison.abofonsa.domain.enumeration.Locale;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A CMS user (spec §8.2 {@code adminUsers}). Only the document shape lands in Phase 2 — enough for
 * {@code V008SeedAdminUser} to bootstrap the first account; the login/JWT/lockout logic that reads
 * and writes it is Phase 5.
 */
@Document(collection = "adminUsers")
public record AdminUser(
        @Id String id,
        int schemaVersion,
        String username,
        String email,
        String displayName,
        String passwordHash,
        List<AdminRole> roles,
        /** Empty = all locales (spec §8.2 — a translator scoped to one locale can't touch the rest). */
        List<Locale> localeScope,
        boolean active,
        int failedLoginAttempts,
        Instant lockedUntil,
        Instant lastLoginAt,
        boolean mustChangePassword,
        Instant createdAt,
        String createdBy) {}
