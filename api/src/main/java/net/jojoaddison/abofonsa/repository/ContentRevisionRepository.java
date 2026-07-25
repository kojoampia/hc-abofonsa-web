package net.jojoaddison.abofonsa.repository;

import java.util.List;
import java.util.Optional;
import net.jojoaddison.abofonsa.domain.ContentRevision;
import net.jojoaddison.abofonsa.domain.enumeration.ContentType;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ContentRevisionRepository extends MongoRepository<ContentRevision, String> {

    List<ContentRevision> findByEntityTypeAndEntityIdOrderByRevisionNumberDesc(ContentType entityType, String entityId);

    Optional<ContentRevision> findTopByEntityTypeAndEntityIdOrderByRevisionNumberDesc(
            ContentType entityType, String entityId);
}
