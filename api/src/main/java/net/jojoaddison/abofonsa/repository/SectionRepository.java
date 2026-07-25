package net.jojoaddison.abofonsa.repository;

import java.util.List;
import java.util.Optional;
import net.jojoaddison.abofonsa.domain.Section;
import net.jojoaddison.abofonsa.domain.enumeration.PublicationStatus;
import net.jojoaddison.abofonsa.domain.enumeration.SectionKey;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SectionRepository extends MongoRepository<Section, String> {

    Optional<Section> findByKey(SectionKey key);

    List<Section> findByStatus(PublicationStatus status);
}
