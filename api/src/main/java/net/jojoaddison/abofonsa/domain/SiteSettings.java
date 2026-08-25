package net.jojoaddison.abofonsa.domain;

import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.domain.enumeration.SocialPlatform;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
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
        @Field("professionalPortalUrl") String professionalPortalUrl,
        @Field("patientPortalUrl") String patientPortalUrl,
        Address address,
        @Field("coordinationHours") LocalizedText coordinationHours,
        @Field("onCallHours") LocalizedText onCallHours,
        List<SocialLink> socialLinks,
        Seo seo,
        Instant updatedAt,
        String updatedBy,
        /**
         * Optimistic-locking version, as on every other content type.
         *
         * <p>Absent until Phase C4, which meant the CMS could never save site settings at all: the
         * admin update matches on {@code {_id, version}}, and a document with no {@code version}
         * matches nothing, so every write silently modified zero documents and then 500ed on the
         * conflict path. Nothing caught it because no test had ever saved this screen — the settings
         * editor was only read from.
         */
        @Version Long version) {

    public static final String SINGLETON_VALUE = "SITE";

    public record Address(String street, String district, String city, String country, GeoJsonPoint geo) {}

    public record SocialLink(SocialPlatform platform, String url) {}

    public record Seo(LocalizedText defaultTitle, LocalizedText defaultDescription, String ogImageId) {}
}
