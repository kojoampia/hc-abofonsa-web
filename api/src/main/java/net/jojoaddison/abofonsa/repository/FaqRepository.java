package net.jojoaddison.abofonsa.repository;

import java.util.List;
import net.jojoaddison.abofonsa.domain.Faq;
import net.jojoaddison.abofonsa.domain.enumeration.FaqCategory;
import net.jojoaddison.abofonsa.domain.enumeration.PublicationStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface FaqRepository extends MongoRepository<Faq, String> {

    List<Faq> findByStatusOrderByDisplayOrderAsc(PublicationStatus status);

    List<Faq> findByCategoryAndStatusOrderByDisplayOrderAsc(FaqCategory category, PublicationStatus status);
}
