package net.jojoaddison.abofonsa.content;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.common.LocalizedText;
import net.jojoaddison.abofonsa.common.PublicationStatus;
import net.jojoaddison.abofonsa.content.ContentRevisionDocument.EntityType;
import net.jojoaddison.abofonsa.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/** Verifies plan.md task 21: revisions are numbered sequentially and never mutated. */
class ContentRevisionServiceTest extends AbstractIntegrationTest {

    @Autowired
    private ContentRevisionService revisionService;

    private ServiceDocument fixture(String id, String blurb) {
        return new ServiceDocument(
                id,
                1,
                "test-slug",
                LocalizedText.of("Test service"),
                LocalizedText.of(blurb),
                List.of(),
                LocalizedText.of("All plans"),
                null,
                1,
                PublicationStatus.DRAFT,
                null,
                Instant.now(),
                Instant.now(),
                "usr_test",
                "usr_test",
                null);
    }

    @Test
    void sequentialSavesProduceIncrementingRevisionNumbersAndImmutableSnapshots() {
        var entityId = "svc-revision-test";

        var first = revisionService.recordRevision(
                fixture(entityId, "First version"), EntityType.SERVICE, "initial draft", List.of(), "usr_a");
        var second = revisionService.recordRevision(
                fixture(entityId, "Second version"), EntityType.SERVICE, "updated blurb", List.of(), "usr_b");

        assertThat(first.revisionNumber()).isEqualTo(1);
        assertThat(second.revisionNumber()).isEqualTo(2);

        // The first snapshot must still read "First version" - recording the second revision must
        // not have mutated it.
        var history = revisionService.history(EntityType.SERVICE, entityId);
        assertThat(history).hasSize(2);
        var reloadedFirst = history.stream()
                .filter(r -> r.revisionNumber() == 1)
                .findFirst()
                .orElseThrow();
        assertThat(reloadedFirst
                        .snapshot()
                        .getEmbedded(List.of("blurb"), org.bson.Document.class)
                        .getString("en"))
                .isEqualTo("First version");
    }
}
