package net.jojoaddison.abofonsa.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Caffeine-backed caches for the published public content and UI i18n overrides (spec §7.8).
 * Publishing evicts both globally (see the {@code PublishingService} in Phase 6) rather than
 * targeting individual keys — publishes are infrequent, so the simplicity is worth more than
 * fine-grained invalidation.
 */
@Configuration
public class CacheConfig {

    public static final String SITE_CONTENT = "siteContent";
    public static final String I18N_BUNDLE = "i18nBundle";

    @Bean
    CaffeineCacheManager cacheManager() {
        var manager = new CaffeineCacheManager(SITE_CONTENT, I18N_BUNDLE);
        manager.setCaffeine(Caffeine.newBuilder()
                .maximumSize(64) // 4 locales x generous headroom
                .expireAfterWrite(Duration.ofMinutes(10))
                .recordStats());
        return manager;
    }
}
