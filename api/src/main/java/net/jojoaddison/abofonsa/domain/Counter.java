package net.jojoaddison.abofonsa.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** A named atomic sequence, incremented via {@code findAndModify} — backs the human-quotable
 * {@code ENQ-YYYY-NNNNNN} enquiry references (spec §7.4). */
@Document(collection = "counters")
public record Counter(@Id String id, long seq) {}
