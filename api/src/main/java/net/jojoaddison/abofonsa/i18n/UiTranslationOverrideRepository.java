package net.jojoaddison.abofonsa.i18n;

import java.util.Optional;
import net.jojoaddison.abofonsa.common.Locale;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UiTranslationOverrideRepository extends MongoRepository<UiTranslationOverrideDocument, String> {

    Optional<UiTranslationOverrideDocument> findByLocale(Locale locale);
}
