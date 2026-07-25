package net.jojoaddison.abofonsa.config;

import java.net.URI;
import java.util.Map;
import java.util.UUID;
import net.jojoaddison.abofonsa.common.ContentNotFoundException;
import net.jojoaddison.abofonsa.common.Locale;
import net.jojoaddison.abofonsa.common.UnsupportedLocaleException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
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
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);
    private static final String BASE = "https://www.abofonsa.com/problems/";

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
        // Locale conversion failures (WebConfig's LocaleCodeConverter) surface here, not as a
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
        var correlationId = UUID.randomUUID().toString();
        MDC.put("correlationId", correlationId);
        log.error("Unhandled exception, correlationId={}", correlationId, ex);
        MDC.remove("correlationId");

        var problem = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        problem.setType(URI.create(BASE + "internal-error"));
        problem.setTitle("An unexpected error occurred");
        problem.setProperty("correlationId", correlationId);
        return problem;
    }
}
