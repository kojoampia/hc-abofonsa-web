package net.jojoaddison.abofonsa.config;

import net.jojoaddison.abofonsa.domain.enumeration.ContentType;
import net.jojoaddison.abofonsa.domain.enumeration.Locale;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.format.FormatterRegistry;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web-layer wiring (JHipster's WebConfigurer role): request-value converters and the dev-time
 * static handler for media files.
 *
 * <ul>
 *   <li>{@code ?locale=es} binds to {@link Locale} via its lowercase code, not enum
 *       {@code valueOf}; unsupported codes surface as the uniform 400 problem.
 *   <li>The {@code {type}} path segment of the CMS API binds to {@link ContentType} via the
 *       spec §7.5 plural names ({@code services|plans|testimonials|faqs|sections|settings}).
 *   <li>{@code /media/**} serves the upload storage directory — in production nginx serves these
 *       files directly (spec §8.2); this handler keeps dev/local parity.
 * </ul>
 */
@Configuration
public class WebConfigurer implements WebMvcConfigurer {

    private final ApplicationProperties properties;

    public WebConfigurer(ApplicationProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addFormatters(@NonNull FormatterRegistry registry) {
        registry.addConverter(new LocaleCodeConverter());
        registry.addConverter(new ContentTypePathConverter());
    }

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/media/**")
                .addResourceLocations("file:" + properties.media().storagePath() + "/media/");
    }

    // Package-private (not private) so tests can exercise them directly without a Spring context.
    static final class LocaleCodeConverter implements Converter<String, Locale> {
        @Override
        public Locale convert(@NonNull String source) {
            return Locale.fromCode(source);
        }
    }

    static final class ContentTypePathConverter implements Converter<String, ContentType> {
        @Override
        public ContentType convert(@NonNull String source) {
            return switch (source) {
                case "services" -> ContentType.SERVICE;
                case "plans" -> ContentType.PLAN;
                case "testimonials" -> ContentType.TESTIMONIAL;
                case "faqs" -> ContentType.FAQ;
                case "sections" -> ContentType.SECTION;
                case "career-tracks" -> ContentType.CAREER_TRACK;
                case "settings" -> ContentType.SETTINGS;
                default -> throw new IllegalArgumentException("Unknown content type: " + source);
            };
        }
    }
}
