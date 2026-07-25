package net.jojoaddison.abofonsa.repository;

import java.util.List;
import net.jojoaddison.abofonsa.domain.Media;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MediaRepository extends MongoRepository<Media, String> {

    Page<Media> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /** The orphan report (R-9): assets no content entity references. */
    List<Media> findByReferencedByIsEmpty();
}
