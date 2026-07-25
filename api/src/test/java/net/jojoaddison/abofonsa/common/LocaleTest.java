package net.jojoaddison.abofonsa.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class LocaleTest {

    @Test
    void fromCodeIsCaseInsensitive() {
        assertThat(Locale.fromCode("es")).isEqualTo(Locale.ES);
        assertThat(Locale.fromCode("ES")).isEqualTo(Locale.ES);
    }

    @Test
    void fromCodeRejectsUnsupportedCodes() {
        assertThatThrownBy(() -> Locale.fromCode("it"))
                .isInstanceOf(UnsupportedLocaleException.class)
                .hasMessageContaining("it");
    }

    @Test
    void allContainsExactlyFourLocalesInDeclarationOrder() {
        assertThat(Locale.ALL).containsExactly(Locale.EN, Locale.ES, Locale.FR, Locale.DE);
    }
}
