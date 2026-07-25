package net.jojoaddison.abofonsa.config.dbmigrations;

import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.stereotype.Component;

/**
 * The {@code refreshTokens} collection (spec §7.7): unique lookup by token hash, a TTL index so
 * expired tokens are purged by MongoDB itself, and a per-user index for bulk revocation.
 */
@Component
public class V010AddRefreshTokens implements Changelog {

    @Override
    public String id() {
        return "V010_add_refresh_tokens";
    }

    @Override
    public void execute(MongoTemplate mongoTemplate) {
        if (!mongoTemplate.collectionExists("refreshTokens")) {
            mongoTemplate.createCollection("refreshTokens");
        }
        mongoTemplate.indexOps("refreshTokens").ensureIndex(new Index("tokenHash", Sort.Direction.ASC).unique());
        mongoTemplate.indexOps("refreshTokens").ensureIndex(new Index("username", Sort.Direction.ASC));
        mongoTemplate.indexOps("refreshTokens").ensureIndex(new Index("expiresAt", Sort.Direction.ASC).expire(0));
    }
}
