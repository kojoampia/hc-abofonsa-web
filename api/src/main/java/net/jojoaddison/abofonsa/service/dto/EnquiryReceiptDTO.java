package net.jojoaddison.abofonsa.service.dto;

import java.time.Instant;

/** The {@code 201 Created} acknowledgement — a human-quotable reference for phone follow-up
 * (spec §7.4). */
public record EnquiryReceiptDTO(String reference, Instant receivedAt) {}
