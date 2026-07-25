package net.jojoaddison.abofonsa.web.rest.errors;

import java.util.List;

/** Translated to 422 — publishing blocked because English is incomplete (E-6), with the list of
 * offending fields so the editor sees exactly what to fix. */
public class UnprocessableContentException extends RuntimeException {

    private final transient List<String> fields;

    public UnprocessableContentException(String message, List<String> fields) {
        super(message);
        this.fields = fields;
    }

    public List<String> fields() {
        return fields;
    }
}
