package net.jojoaddison.abofonsa.config;

import java.util.EnumMap;
import java.util.List;
import net.jojoaddison.abofonsa.domain.LocalizedText;
import net.jojoaddison.abofonsa.domain.enumeration.Locale;
import org.bson.Document;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.ReadingConverter;
import org.springframework.data.convert.WritingConverter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;
import org.springframework.lang.NonNull;

/**
 * Two sets of custom conversions, both driven by the same requirement: persisted documents must
 * match spec §8.1's exact shape — lowercase locale codes ({@code en}, {@code es}, {@code fr},
 * {@code de}), not the enum's uppercase {@code name()}.
 *
 * <ol>
 *   <li>{@link Locale} <-> {@link String}, for simple {@code Locale}-typed fields (e.g.
 *       {@code adminUsers.localeScope}).
 *   <li>{@link LocalizedText} <-> {@link Document}, so it serialises as the flat
 *       {@code { "en": "…", "es": "…" }} object spec §8.1 shows — without this, Spring Data would
 *       nest it one level deeper as {@code { "values": { "en": "…" } } }, since
 *       {@code LocalizedText} is itself a record wrapping a {@code Map}.
 * </ol>
 */
@Configuration
public class DatabaseConfiguration {

    @Bean
    MongoCustomConversions mongoCustomConversions() {
        return new MongoCustomConversions(List.of(
                new LocaleToStringConverter(),
                new StringToLocaleConverter(),
                new LocalizedTextToDocumentConverter(),
                new DocumentToLocalizedTextConverter()));
    }

    @WritingConverter
    static final class LocaleToStringConverter implements Converter<Locale, String> {
        @Override
        public String convert(@NonNull Locale source) {
            return source.code();
        }
    }

    @ReadingConverter
    static final class StringToLocaleConverter implements Converter<String, Locale> {
        @Override
        public Locale convert(@NonNull String source) {
            return Locale.fromCode(source);
        }
    }

    @WritingConverter
    static final class LocalizedTextToDocumentConverter implements Converter<LocalizedText, Document> {
        @Override
        public Document convert(@NonNull LocalizedText source) {
            var document = new Document();
            source.values().forEach((locale, value) -> document.put(locale.code(), value));
            return document;
        }
    }

    @ReadingConverter
    static final class DocumentToLocalizedTextConverter implements Converter<Document, LocalizedText> {
        @Override
        public LocalizedText convert(@NonNull Document source) {
            var values = new EnumMap<Locale, String>(Locale.class);
            source.forEach((key, value) -> {
                if (value instanceof String text) {
                    values.put(Locale.fromCode(key), text);
                }
            });
            return new LocalizedText(values);
        }
    }
}
