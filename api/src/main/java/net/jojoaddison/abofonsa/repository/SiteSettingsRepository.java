package net.jojoaddison.abofonsa.repository;

import java.util.Optional;
import net.jojoaddison.abofonsa.domain.SiteSettings;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SiteSettingsRepository extends MongoRepository<SiteSettings, String> {

    Optional<SiteSettings> findBySingleton(String singleton);

    default Optional<SiteSettings> findTheSettings() {
        return findBySingleton(SiteSettings.SINGLETON_VALUE);
    }
}
