package net.jojoaddison.abofonsa.domain;

import java.time.Instant;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A media library asset (spec §8.2 {@code media}). Binaries live on the filesystem behind nginx
 * (spec §14.2 decision #6), never in MongoDB; {@code referencedBy} is maintained on every content
 * save so deleting an in-use asset can be refused (R-9).
 */
@Document(collection = "media")
public record Media(
        @Id String id,
        int schemaVersion,
        String filename,
        String contentType,
        long bytes,
        int width,
        int height,
        String blurHash,
        String storageKey,
        List<Variant> variants,
        LocalizedText alt,
        List<Reference> referencedBy,
        Instant createdAt,
        String createdBy) {

    public record Variant(String label, int width, String storageKey, long bytes) {}

    public record Reference(String entityType, String entityId) {}
}
