package net.jojoaddison.abofonsa.web.rest.errors;

/** Thrown when the enquiry rate limit (5/hour/IP, spec §7.7) is exceeded; translated to 429. */
public class TooManyRequestsException extends RuntimeException {

    public TooManyRequestsException(String message) {
        super(message);
    }
}
