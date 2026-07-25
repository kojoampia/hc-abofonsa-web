package net.jojoaddison.abofonsa.content;

import java.util.List;
import java.util.Optional;
import net.jojoaddison.abofonsa.common.PublicationStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PlanRepository extends MongoRepository<PlanDocument, String> {

    Optional<PlanDocument> findByCode(String code);

    List<PlanDocument> findByStatusOrderByDisplayOrderAsc(PublicationStatus status);

    List<PlanDocument> findByFeaturedTrueAndStatus(PublicationStatus status);
}
