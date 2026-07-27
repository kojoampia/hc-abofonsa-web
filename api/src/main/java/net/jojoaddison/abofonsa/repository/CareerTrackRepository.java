package net.jojoaddison.abofonsa.repository;

import java.util.List;
import java.util.Optional;
import net.jojoaddison.abofonsa.domain.CareerTrack;
import net.jojoaddison.abofonsa.domain.enumeration.PublicationStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CareerTrackRepository extends MongoRepository<CareerTrack, String> {

    Optional<CareerTrack> findBySlug(String slug);

    List<CareerTrack> findByStatusOrderByDisplayOrderAsc(PublicationStatus status);
}
