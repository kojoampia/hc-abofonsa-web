package net.jojoaddison.abofonsa.content;

import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.common.LocalizedText;
import net.jojoaddison.abofonsa.common.PublicationStatus;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

/**
 * A page section whose copy is editable but whose layout is fixed in code — hero, assurance,
 * process, approach, stats, angel, cta (spec §8.2 {@code sections}).
 */
@Document(collection = "sections")
public record SectionDocument(
        @Id String id,
        int schemaVersion,
        SectionKey key,
        LocalizedText eyebrow,
        LocalizedText heading,
        LocalizedText subheading,
        LocalizedText body,
        List<Item> items,
        @Field("imageId") String imageId,
        PublicationStatus status,
        @Field("publishedRevisionId") String publishedRevisionId,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy,
        @Version Long version)
        implements ContentEntity {

    public enum SectionKey {
        HERO,
        ASSURANCE,
        PROCESS,
        APPROACH,
        STATS,
        ANGEL,
        CTA
    }

    /** An assurance item, process step, statistic, or feature bullet within a section. */
    public record Item(String key, String icon, LocalizedText title, LocalizedText body) {}
}
