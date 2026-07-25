package net.jojoaddison.abofonsa.config.dbmigrations;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** Marks a {@link Changelog} as executed — analogous to Mongock's {@code mongockChangeLog}. */
@Document(collection = "schemaMigrations")
public record MigrationRecord(@Id String id, Instant executedAt) {}
