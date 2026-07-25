package net.jojoaddison.abofonsa.content;

import java.util.List;
import net.jojoaddison.abofonsa.common.PublicationStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface FaqRepository extends MongoRepository<FaqDocument, String> {

    List<FaqDocument> findByStatusOrderByDisplayOrderAsc(PublicationStatus status);

    List<FaqDocument> findByCategoryAndStatusOrderByDisplayOrderAsc(
            FaqDocument.FaqCategory category, PublicationStatus status);
}
