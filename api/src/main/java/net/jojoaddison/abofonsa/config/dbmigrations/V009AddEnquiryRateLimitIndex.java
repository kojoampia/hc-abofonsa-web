package net.jojoaddison.abofonsa.config.dbmigrations;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.CompoundIndexDefinition;
import org.springframework.stereotype.Component;

/**
 * Compound index backing the enquiry rate-limit query ({@code meta.ipHash} + {@code createdAt},
 * spec §7.7) — additive, per the spec §12.5 migration rule. Also creates the {@code counters}
 * collection used for {@code ENQ-YYYY-NNNNNN} reference sequences; no validator needed, it is
 * internal bookkeeping.
 */
@Component
public class V009AddEnquiryRateLimitIndex implements Changelog {

    @Override
    public String id() {
        return "V009_add_enquiry_rate_limit_index";
    }

    @Override
    public void execute(MongoTemplate mongoTemplate) {
        mongoTemplate
                .indexOps("enquiries")
                .ensureIndex(
                        new CompoundIndexDefinition(new org.bson.Document("meta.ipHash", 1).append("createdAt", -1)));
        if (!mongoTemplate.collectionExists("counters")) {
            mongoTemplate.createCollection("counters");
        }
    }
}
