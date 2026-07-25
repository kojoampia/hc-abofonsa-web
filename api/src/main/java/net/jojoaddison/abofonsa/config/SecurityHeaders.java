package net.jojoaddison.abofonsa.config;

/**
 * The exact CSP value from spec §13.2. {@code style-src 'unsafe-inline'} is required by Angular
 * Material's runtime style injection — it is the only relaxation, documented here so it is not
 * quietly widened later.
 */
final class SecurityHeaders {

    private SecurityHeaders() {}

    static final String CONTENT_SECURITY_POLICY = "default-src 'self'; "
            + "img-src 'self' data:; "
            + "style-src 'self' 'unsafe-inline'; "
            + "script-src 'self'; "
            + "connect-src 'self'; "
            + "frame-ancestors 'none'; "
            + "base-uri 'self'; "
            + "form-action 'self'";
}
