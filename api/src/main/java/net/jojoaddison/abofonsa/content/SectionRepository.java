package net.jojoaddison.abofonsa.content;

import java.util.List;
import java.util.Optional;
import net.jojoaddison.abofonsa.common.PublicationStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SectionRepository extends MongoRepository<SectionDocument, String> {

    Optional<SectionDocument> findByKey(SectionDocument.SectionKey key);

    List<SectionDocument> findByStatus(PublicationStatus status);
}
