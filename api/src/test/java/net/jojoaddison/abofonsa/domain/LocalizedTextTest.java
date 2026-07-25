package net.jojoaddison.abofonsa.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import net.jojoaddison.abofonsa.domain.enumeration.Locale;
import org.junit.jupiter.api.Test;

class LocalizedTextTest {

    @Test
    void resolveReturnsRequestedLocaleWhenPresent() {
        var text = new LocalizedText(Map.of(Locale.EN, "Hello", Locale.FR, "Bonjour"));
        assertThat(text.resolve(Locale.FR)).isEqualTo("Bonjour");
    }

    @Test
    void resolveFallsBackToEnglishWhenRequestedLocaleIsMissing() {
        var text = LocalizedText.of("Hello");
        assertThat(text.resolve(Locale.DE)).isEqualTo("Hello");
    }

    @Test
    void resolveFallsBackToEnglishWhenRequestedLocaleIsBlank() {
        var text = new LocalizedText(Map.of(Locale.EN, "Hello", Locale.DE, ""));
        assertThat(text.resolve(Locale.DE)).isEqualTo("Hello");
    }

    @Test
    void resolveReturnsEmptyWhenNothingIsTranslatedAtAll() {
        assertThat(LocalizedText.empty().resolve(Locale.EN)).isEmpty();
    }

    @Test
    void completenessReflectsFractionOfLocalesTranslated() {
        var text = new LocalizedText(Map.of(Locale.EN, "Hello", Locale.FR, "Bonjour"));
        assertThat(text.completeness()).isEqualTo(0.5);
    }

    @Test
    void hasTranslationIsFalseForBlankValues() {
        var text = new LocalizedText(Map.of(Locale.EN, "Hello", Locale.ES, "   "));
        assertThat(text.hasTranslation(Locale.ES)).isFalse();
        assertThat(text.hasTranslation(Locale.EN)).isTrue();
        assertThat(text.hasTranslation(Locale.FR)).isFalse();
    }
}
