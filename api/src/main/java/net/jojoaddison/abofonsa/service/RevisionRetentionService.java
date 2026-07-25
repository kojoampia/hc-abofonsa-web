package net.jojoaddison.abofonsa.service;

import net.jojoaddison.abofonsa.domain.ContentRevision;
import net.jojoaddison.abofonsa.repository.ContentRevisionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/** The monthly revision-retention job (spec §8.2, plan task 51): latest 50 per entity plus every
 * published revision survive; the remainder is pruned. */
@Service
public class RevisionRetentionService {

    static final int KEEP_LATEST = 50;

    private static final Logger log = LoggerFactory.getLogger(RevisionRetentionService.class);

    private final ContentRevisionRepository revisionRepository;
    private final ContentRevisionService revisionService;

    public RevisionRetentionService(
            ContentRevisionRepository revisionRepository, ContentRevisionService revisionService) {
        this.revisionRepository = revisionRepository;
        this.revisionService = revisionService;
    }

    @Scheduled(cron = "0 0 3 1 * *") // 03:00 on the 1st of every month
    public void pruneAll() {
        var pruned = revisionRepository.findAll().stream()
                .map(r -> r.entityType() + ":" + r.entityId())
                .distinct()
                .mapToLong(key -> {
                    var parts = key.split(":", 2);
                    return revisionService.prune(
                            net.jojoaddison.abofonsa.domain.enumeration.ContentType.valueOf(parts[0]),
                            parts[1],
                            KEEP_LATEST);
                })
                .sum();
        log.info("Revision retention pruned {} revisions", pruned);
    }

    /** Test seam. */
    long pruneEntity(ContentRevision anyRevisionOfEntity) {
        return revisionService.prune(anyRevisionOfEntity.entityType(), anyRevisionOfEntity.entityId(), KEEP_LATEST);
    }
}
