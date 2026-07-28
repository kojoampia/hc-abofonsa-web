package net.jojoaddison.abofonsa.domain;

import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.domain.enumeration.SocialPlatform;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

/**
 * Singleton document holding contact details, hours and SEO defaults (spec §8.2
 * {@code siteSettings}) — guarded by a unique index on {@code singleton}, not part of the
 * {@link ContentEntity} revision/publish lifecycle.
 */
@Document(collection = "siteSettings")
public record SiteSettings(
        @Id String id,
        int schemaVersion,
        String singleton,
        String organisationName,
        LocalizedText tagline,
        List<String> phones,
        String whatsapp,
        String email,
        String website,
        @Field("professionalInvitationUrl") String professionalInvitationUrl,
        Address address,
        @Field("coordinationHours") LocalizedText coordinationHours,
        @Field("onCallHours") LocalizedText onCallHours,
        List<SocialLink> socialLinks,
        Seo seo,
        Instant updatedAt,
        String updatedBy) {

    public static final String SINGLETON_VALUE = "SITE";

    public record Address(String street, String district, String city, String country, GeoJsonPoint geo) {}

    public record SocialLink(SocialPlatform platform, String url) {}

    public record Seo(LocalizedText defaultTitle, LocalizedText defaultDescription, String ogImageId) {}
}
