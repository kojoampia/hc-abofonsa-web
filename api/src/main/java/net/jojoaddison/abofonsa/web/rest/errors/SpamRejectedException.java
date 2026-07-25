package net.jojoaddison.abofonsa.web.rest.errors;

/**
 * Thrown when a submission trips the honeypot or minimum-dwell-time check (spec §7.7). Translated
 * to a deliberately generic 400 — the response never explains which anti-abuse rule fired, so
 * bots learn nothing from probing.
 */
public class SpamRejectedException extends RuntimeException {

    public SpamRejectedException(String internalReason) {
        super(internalReason);
    }
}
