package net.jojoaddison.abofonsa.content;

import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SiteSettingsRepository extends MongoRepository<SiteSettingsDocument, String> {

    Optional<SiteSettingsDocument> findBySingleton(String singleton);

    default Optional<SiteSettingsDocument> findTheSettings() {
        return findBySingleton(SiteSettingsDocument.SINGLETON_VALUE);
    }
}
