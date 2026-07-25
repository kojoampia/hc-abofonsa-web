package net.jojoaddison.abofonsa.repository;

import java.util.Optional;
import net.jojoaddison.abofonsa.domain.UiTranslationOverride;
import net.jojoaddison.abofonsa.domain.enumeration.Locale;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UiTranslationOverrideRepository extends MongoRepository<UiTranslationOverride, String> {

    Optional<UiTranslationOverride> findByLocale(Locale locale);
}
