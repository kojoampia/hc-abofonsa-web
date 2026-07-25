package net.jojoaddison.abofonsa.content;

import java.util.List;
import net.jojoaddison.abofonsa.common.PublicationStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TestimonialRepository extends MongoRepository<TestimonialDocument, String> {

    List<TestimonialDocument> findByStatusOrderByDisplayOrderAsc(PublicationStatus status);
}
