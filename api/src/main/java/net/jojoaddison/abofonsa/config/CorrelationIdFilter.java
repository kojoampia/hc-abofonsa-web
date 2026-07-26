package net.jojoaddison.abofonsa.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Gives every request a correlation id, echoes it as {@code X-Request-Id}, and makes it available
 * to anything running underneath (spec §13.5).
 *
 * <p>Support asks "what happened to my enquiry at 14:32" and the answer has to be findable. The id
 * travels three ways: back to the caller in the response header so it can be quoted in a bug
 * report, into the MDC so every log line for the request carries it, and through a
 * {@link ScopedValue} so code that needs it can read it without a parameter threaded through every
 * signature.
 *
 * <p>{@code ScopedValue} rather than a {@code ThreadLocal} because the binding is immutable and
 * unbinds automatically when {@code runWhere} returns — a thread returned to the pool cannot leak
 * the previous request's id into the next one, which is precisely the bug ThreadLocal-based
 * correlation ids are famous for. MDC is still set alongside it because the logging framework only
 * reads MDC.
 *
 * <p>Runs first, ahead of security: an authentication failure is exactly the kind of event that
 * needs to be traceable, and a filter ordered after security never sees it.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Request-Id";
    private static final String MDC_KEY = "correlationId";

    /** The current request's correlation id, or unbound outside a request. */
    public static final ScopedValue<String> CORRELATION_ID = ScopedValue.newInstance();

    /**
     * An inbound id is echoed so a caller (nginx, a load balancer, the SSR server) can correlate
     * its own logs with ours — but only if it looks like an id. An unvalidated header would let a
     * caller inject newlines into our log stream and forge entries, and it lands in a response
     * header where it could carry a header-splitting payload.
     */
    private static final Pattern SAFE_ID = Pattern.compile("[A-Za-z0-9._:-]{1,128}");

    static String resolve(HttpServletRequest request) {
        var inbound = request.getHeader(HEADER);
        return inbound != null && SAFE_ID.matcher(inbound).matches()
                ? inbound
                : UUID.randomUUID().toString();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var correlationId = resolve(request);
        response.setHeader(HEADER, correlationId);
        MDC.put(MDC_KEY, correlationId);
        try {
            ScopedValue.where(CORRELATION_ID, correlationId).run(() -> {
                try {
                    chain.doFilter(request, response);
                } catch (IOException | ServletException e) {
                    // ScopedValue.run takes a Runnable, which cannot throw checked exceptions;
                    // unwrapped again immediately below so the container sees the original.
                    throw new FilterException(e);
                }
            });
        } catch (FilterException wrapped) {
            switch (wrapped.getCause()) {
                case IOException e -> throw e;
                case ServletException e -> throw e;
                default -> throw wrapped;
            }
        } finally {
            MDC.remove(MDC_KEY);
        }
    }

    /** Carries a checked filter-chain failure across the ScopedValue boundary. */
    private static final class FilterException extends RuntimeException {
        FilterException(Exception cause) {
            super(cause);
        }
    }
}
