package net.jojoaddison.abofonsa.content;

import java.util.List;
import java.util.Optional;
import net.jojoaddison.abofonsa.common.PublicationStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ServiceRepository extends MongoRepository<ServiceDocument, String> {

    Optional<ServiceDocument> findBySlug(String slug);

    List<ServiceDocument> findByStatusOrderByDisplayOrderAsc(PublicationStatus status);
}
