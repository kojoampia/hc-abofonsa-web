package net.jojoaddison.abofonsa.domain;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A refresh token (spec §7.7: 14 days, rotated on every use, stored hashed — the raw token value
 * exists only in the client's hands). {@code replacedBy} records the rotation chain; presenting
 * an already-rotated token is treated as a possible theft signal and rejected.
 */
@Document(collection = "refreshTokens")
public record RefreshToken(
        @Id String id,
        int schemaVersion,
        String userId,
        String username,
        String tokenHash,
        Instant expiresAt,
        Instant createdAt,
        boolean revoked,
        String replacedBy) {}
