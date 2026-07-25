package net.jojoaddison.abofonsa.config.dbmigrations;

import org.springframework.data.mongodb.core.MongoTemplate;

/**
 * One ordered, idempotent database change — the in-house replacement for Mongock changelogs (see
 * {@code CONTRIBUTING.md}'s "Toolchain deviations" section for why). Each implementation is a
 * Spring bean; {@link ChangelogRunner} discovers all of them, sorts by {@link #id()}, and runs
 * every one not already recorded in the {@code schemaMigrations} collection, exactly once, in
 * order — the same guarantee Mongock's changelog mechanism provides.
 */
public interface Changelog {

    /** Sortable, unique identifier — {@code V001_create_collections_and_indexes} etc. Ordering is
     * lexicographic, so IDs must be zero-padded to sort correctly past V009. */
    String id();

    void execute(MongoTemplate mongoTemplate);
}
