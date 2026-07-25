package net.jojoaddison.abofonsa.service;

import static org.assertj.core.api.Assertions.assertThat;

import net.jojoaddison.abofonsa.AbstractIntegrationTest;
import net.jojoaddison.abofonsa.domain.enumeration.ContentType;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/** Plan task 51: latest 50 revisions plus every published revision survive pruning. */
class RevisionRetentionTest extends AbstractIntegrationTest {

    @Autowired
    private ContentRevisionService revisionService;

    @Test
    void pruneKeepsLatestFiftyPlusEveryPublishedRevision() {
        var entityId = "prune-target";
        for (int i = 1; i <= 60; i++) {
            // Revision 3 was once published - it must survive pruning regardless of age.
            var status = i == 3 ? "PUBLISHED" : "DRAFT";
            revisionService.recordRawRevision(
                    ContentType.SERVICE, entityId, new Document("marker", i), status, "rev " + i, "test");
        }

        var removed = revisionService.prune(ContentType.SERVICE, entityId, 50);

        var remaining = revisionService.history(ContentType.SERVICE, entityId);
        // 60 total: the newest 50 (11..60) survive, plus published #3; #1,2,4..10 (9 drafts) go.
        assertThat(removed).isEqualTo(9);
        assertThat(remaining).hasSize(51);
        assertThat(remaining).anyMatch(r -> r.revisionNumber() == 3);
        assertThat(remaining).noneMatch(r -> r.revisionNumber() == 4);
    }
}
