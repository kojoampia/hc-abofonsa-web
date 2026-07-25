package net.jojoaddison.abofonsa.content;

import java.util.List;
import java.util.Optional;
import net.jojoaddison.abofonsa.content.ContentRevisionDocument.EntityType;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ContentRevisionRepository extends MongoRepository<ContentRevisionDocument, String> {

    List<ContentRevisionDocument> findByEntityTypeAndEntityIdOrderByRevisionNumberDesc(
            EntityType entityType, String entityId);

    Optional<ContentRevisionDocument> findTopByEntityTypeAndEntityIdOrderByRevisionNumberDesc(
            EntityType entityType, String entityId);
}
