package net.jojoaddison.abofonsa.config;

import net.jojoaddison.abofonsa.common.Locale;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.format.FormatterRegistry;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Binds {@code ?locale=es} query params to {@link Locale} using its lowercase {@code code}, not
 * enum {@code valueOf} (which would require the request to say {@code ES}). An unsupported code
 * flows into {@link Locale#fromCode} and throws {@link net.jojoaddison.abofonsa.common.UnsupportedLocaleException},
 * handled uniformly by {@link ApiExceptionHandler}.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addFormatters(@NonNull FormatterRegistry registry) {
        registry.addConverter(new LocaleCodeConverter());
    }

    // Package-private (not private) so LocaleCodeConverterTest can exercise it directly without
    // spinning up a Spring context.
    static final class LocaleCodeConverter implements Converter<String, Locale> {
        @Override
        public Locale convert(@NonNull String source) {
            return Locale.fromCode(source);
        }
    }
}
