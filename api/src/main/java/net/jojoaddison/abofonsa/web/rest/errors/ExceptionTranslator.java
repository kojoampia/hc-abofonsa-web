package net.jojoaddison.abofonsa.web.rest.errors;

import java.net.URI;
import java.util.Map;
import java.util.UUID;
import net.jojoaddison.abofonsa.config.CorrelationIdFilter;
import net.jojoaddison.abofonsa.domain.enumeration.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * RFC 9457 problem responses (spec §7.6). Internal errors return a generic problem document with
 * a correlation id — never a stack trace or exception message — and are logged server-side with
 * that same id so the two can be joined.
 */
@RestControllerAdvice
public class ExceptionTranslator {

    private static final Logger log = LoggerFactory.getLogger(ExceptionTranslator.class);
    private static final String BASE = "https://www.abofonsa.com/problems/";

    @ExceptionHandler(ConflictException.class)
    ProblemDetail onConflict(ConflictException ex) {
        var problem = ProblemDetail.forStatus(HttpStatus.CONFLICT);
        problem.setType(URI.create(BASE + "conflict"));
        problem.setTitle("Conflict");
        problem.setDetail(ex.getMessage());
        ex.properties().forEach(problem::setProperty);
        return problem;
    }

    @ExceptionHandler(UnprocessableContentException.class)
    ProblemDetail onUnprocessable(UnprocessableContentException ex) {
        var problem = ProblemDetail.forStatus(HttpStatus.UNPROCESSABLE_ENTITY);
        problem.setType(URI.create(BASE + "english-incomplete"));
        problem.setTitle("English content incomplete");
        problem.setDetail(ex.getMessage());
        problem.setProperty("fields", ex.fields());
        return problem;
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    ProblemDetail onAccessDenied(org.springframework.security.access.AccessDeniedException ex) {
        // Without this handler the generic Exception handler below would swallow method-security
        // denials into a 500; the correct answer for an authenticated-but-unauthorized caller is
        // 403 (spec §9.1 role matrix).
        var problem = ProblemDetail.forStatus(HttpStatus.FORBIDDEN);
        problem.setType(URI.create(BASE + "forbidden"));
        problem.setTitle("Insufficient permissions");
        return problem;
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    ProblemDetail onInvalidCredentials(InvalidCredentialsException ex) {
        // One generic 401 for every auth failure - wrong password, unknown user, locked account,
        // bad refresh token - so nothing can be enumerated. The internal reason is only logged.
        log.info("Authentication rejected: {}", ex.getMessage());
        var problem = ProblemDetail.forStatus(HttpStatus.UNAUTHORIZED);
        problem.setType(URI.create(BASE + "invalid-credentials"));
        problem.setTitle("Invalid credentials");
        return problem;
    }

    @ExceptionHandler(TooManyRequestsException.class)
    ProblemDetail onRateLimit(TooManyRequestsException ex) {
        var problem = ProblemDetail.forStatus(HttpStatus.TOO_MANY_REQUESTS);
        problem.setType(URI.create(BASE + "rate-limit"));
        problem.setTitle("Too many requests");
        problem.setDetail("Please try again later.");
        return problem;
    }

    @ExceptionHandler(SpamRejectedException.class)
    ProblemDetail onSpamRejected(SpamRejectedException ex) {
        // Deliberately generic - never reveal which anti-abuse rule fired (spec §7.7). The
        // internal reason is logged without any submission content.
        log.info("Enquiry submission rejected: {}", ex.getMessage());
        var problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setType(URI.create(BASE + "rejected"));
        problem.setTitle("Submission rejected");
        return problem;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail onValidation(MethodArgumentNotValidException ex) {
        var problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setType(URI.create(BASE + "validation"));
        problem.setTitle("Validation failed");
        problem.setProperty(
                "errors",
                ex.getBindingResult().getFieldErrors().stream()
                        .map(e -> Map.of("field", e.getField(), "message", String.valueOf(e.getDefaultMessage())))
                        .toList());
        return problem;
    }

    @ExceptionHandler(ContentNotFoundException.class)
    ProblemDetail onNotFound(ContentNotFoundException ex) {
        var problem = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);
        problem.setType(URI.create(BASE + "not-found"));
        problem.setTitle("Content not found");
        problem.setDetail(ex.getMessage());
        return problem;
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ProblemDetail onTypeMismatch(MethodArgumentTypeMismatchException ex) {
        // Locale conversion failures (WebConfigurer's LocaleCodeConverter) surface here, not as a
        // bare UnsupportedLocaleException - Spring wraps @RequestParam/@PathVariable conversion
        // failures before they reach exception handling.
        if (ex.getCause() instanceof UnsupportedLocaleException unsupportedLocale) {
            return onLocale(unsupportedLocale);
        }
        var problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setType(URI.create(BASE + "invalid-argument"));
        problem.setTitle("Invalid argument");
        problem.setDetail("'%s' is not a valid value for parameter '%s'".formatted(ex.getValue(), ex.getName()));
        return problem;
    }

    @ExceptionHandler(UnsupportedLocaleException.class)
    ProblemDetail onLocale(UnsupportedLocaleException ex) {
        var problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setType(URI.create(BASE + "unsupported-locale"));
        problem.setTitle("Unsupported locale");
        problem.setProperty("supported", Locale.ALL.stream().map(Locale::code).toList());
        return problem;
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail onUnexpected(Exception ex) {
        // The id the request already carries — the same one in every log line for this request and
        // in its X-Request-Id response header. Minting a fresh one here (as this did) produced an
        // id that appeared in exactly one log line and correlated with nothing.
        var correlationId =
                CorrelationIdFilter.CORRELATION_ID.orElse(UUID.randomUUID().toString());
        log.error("Unhandled exception", ex);

        var problem = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        problem.setType(URI.create(BASE + "internal-error"));
        problem.setTitle("An unexpected error occurred");
        problem.setProperty("correlationId", correlationId);
        return problem;
    }
}
