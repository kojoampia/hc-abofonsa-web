package net.jojoaddison.abofonsa.repository;

import java.util.List;
import java.util.Optional;
import net.jojoaddison.abofonsa.domain.CareService;
import net.jojoaddison.abofonsa.domain.enumeration.PublicationStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CareServiceRepository extends MongoRepository<CareService, String> {

    Optional<CareService> findBySlug(String slug);

    List<CareService> findByStatusOrderByDisplayOrderAsc(PublicationStatus status);
}
