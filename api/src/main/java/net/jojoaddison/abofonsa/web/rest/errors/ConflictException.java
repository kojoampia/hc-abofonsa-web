package net.jojoaddison.abofonsa.web.rest.errors;

import java.util.Map;

/** Translated to 409 — optimistic-lock losers (E-9, with the current state attached so the CMS
 * can offer a diff), consent-gate refusals (E-10) and invariant violations. */
public class ConflictException extends RuntimeException {

    private final transient Map<String, Object> properties;

    public ConflictException(String message) {
        this(message, Map.of());
    }

    public ConflictException(String message, Map<String, Object> properties) {
        super(message);
        this.properties = properties;
    }

    public Map<String, Object> properties() {
        return properties;
    }
}
