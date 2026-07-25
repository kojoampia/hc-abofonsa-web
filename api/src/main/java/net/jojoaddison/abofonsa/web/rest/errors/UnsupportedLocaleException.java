package net.jojoaddison.abofonsa.web.rest.errors;

public class UnsupportedLocaleException extends RuntimeException {

    private final String requestedCode;

    public UnsupportedLocaleException(String requestedCode) {
        super("Unsupported locale: " + requestedCode);
        this.requestedCode = requestedCode;
    }

    public String requestedCode() {
        return requestedCode;
    }
}
