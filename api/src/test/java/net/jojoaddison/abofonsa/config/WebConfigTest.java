package net.jojoaddison.abofonsa.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import net.jojoaddison.abofonsa.common.Locale;
import net.jojoaddison.abofonsa.common.UnsupportedLocaleException;
import org.junit.jupiter.api.Test;

class WebConfigTest {

    private final WebConfig.LocaleCodeConverter converter = new WebConfig.LocaleCodeConverter();

    @Test
    void convertsLowercaseCodeToLocale() {
        assertThat(converter.convert("fr")).isEqualTo(Locale.FR);
    }

    @Test
    void rejectsUnsupportedCodeWithUnsupportedLocaleException() {
        assertThatThrownBy(() -> converter.convert("it")).isInstanceOf(UnsupportedLocaleException.class);
    }
}
