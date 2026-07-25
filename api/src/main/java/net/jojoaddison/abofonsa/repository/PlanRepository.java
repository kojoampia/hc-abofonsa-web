package net.jojoaddison.abofonsa.repository;

import java.util.List;
import java.util.Optional;
import net.jojoaddison.abofonsa.domain.Plan;
import net.jojoaddison.abofonsa.domain.enumeration.PublicationStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PlanRepository extends MongoRepository<Plan, String> {

    Optional<Plan> findByCode(String code);

    List<Plan> findByStatusOrderByDisplayOrderAsc(PublicationStatus status);

    List<Plan> findByFeaturedTrueAndStatus(PublicationStatus status);
}
