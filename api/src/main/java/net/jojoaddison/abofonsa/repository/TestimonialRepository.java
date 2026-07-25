package net.jojoaddison.abofonsa.repository;

import java.util.List;
import net.jojoaddison.abofonsa.domain.Testimonial;
import net.jojoaddison.abofonsa.domain.enumeration.PublicationStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TestimonialRepository extends MongoRepository<Testimonial, String> {

    List<Testimonial> findByStatusOrderByDisplayOrderAsc(PublicationStatus status);
}
