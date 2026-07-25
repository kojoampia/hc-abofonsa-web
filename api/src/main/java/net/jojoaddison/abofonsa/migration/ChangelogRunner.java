package net.jojoaddison.abofonsa.migration;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/**
 * Runs every {@link Changelog} bean, in {@link Changelog#id()} order, skipping any already
 * recorded in {@code schemaMigrations}. Runs once at startup, before the application is expected
 * to serve real traffic.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ChangelogRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ChangelogRunner.class);

    private final List<Changelog> changelogs;
    private final MongoTemplate mongoTemplate;

    public ChangelogRunner(List<Changelog> changelogs, MongoTemplate mongoTemplate) {
        this.changelogs =
                changelogs.stream().sorted(Comparator.comparing(Changelog::id)).toList();
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        Set<String> alreadyExecuted = mongoTemplate.findAll(MigrationRecord.class).stream()
                .map(MigrationRecord::id)
                .collect(Collectors.toSet());

        for (var changelog : changelogs) {
            if (alreadyExecuted.contains(changelog.id())) {
                log.debug("Skipping already-applied changelog {}", changelog.id());
                continue;
            }
            log.info("Applying changelog {}", changelog.id());
            changelog.execute(mongoTemplate);
            mongoTemplate.save(new MigrationRecord(changelog.id(), Instant.now()));
            log.info("Applied changelog {}", changelog.id());
        }
    }
}
