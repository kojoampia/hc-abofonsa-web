package net.jojoaddison.abofonsa.content;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.common.LocalizedText;
import net.jojoaddison.abofonsa.common.PublicationStatus;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

/** A pricing tier — PEAR, PAWPAW or MELON (spec §8.2 {@code plans}, canonical values in §8.5). */
@Document(collection = "plans")
public record PlanDocument(
        @Id String id,
        int schemaVersion,
        String code,
        LocalizedText name,
        LocalizedText forWho,
        Price price,
        LocalizedText priceNote,
        boolean featured,
        List<PlanFeature> features,
        Comparison comparison,
        int displayOrder,
        PublicationStatus status,
        @Field("publishedRevisionId") String publishedRevisionId,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy,
        @Version Long version)
        implements ContentEntity {

    /** {@code amount} is a {@link BigDecimal} — mapped to BSON Decimal128, never a double
     * (spec §8.2 money note): binary floating point cannot represent decimal currency exactly. */
    public record Price(BigDecimal amount, String currency, String period) {}

    public record PlanFeature(LocalizedText label, boolean included, boolean emphasised) {}

    public record Comparison(
            LocalizedText visitsPerWeek,
            LocalizedText medicalSupport,
            LocalizedText auxiliary,
            LocalizedText telemetry,
            LocalizedText reporting,
            LocalizedText careManager) {}
}
