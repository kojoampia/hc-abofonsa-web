package net.jojoaddison.abofonsa.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import net.jojoaddison.abofonsa.common.ContentNotFoundException;
import net.jojoaddison.abofonsa.common.UnsupportedLocaleException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

class ApiExceptionHandlerTest {

    private final ApiExceptionHandler handler = new ApiExceptionHandler();

    @Test
    void validationFailureReturns400WithFieldErrors() {
        var bindingResult = mock(BindingResult.class);
        when(bindingResult.getFieldErrors())
                .thenReturn(List.of(new FieldError("enquiry", "email", "must be a well-formed email address")));
        var ex = mock(MethodArgumentNotValidException.class);
        when(ex.getBindingResult()).thenReturn(bindingResult);

        var problem = handler.onValidation(ex);

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
        assertThat(problem.getTitle()).isEqualTo("Validation failed");
        assertThat(problem.getProperties()).containsKey("errors");
    }

    @Test
    void notFoundReturns404WithDetail() {
        var problem = handler.onNotFound(ContentNotFoundException.forId("service", "abc123"));

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.NOT_FOUND.value());
        assertThat(problem.getDetail()).contains("service").contains("abc123");
    }

    @Test
    void unsupportedLocaleReturns400WithSupportedList() {
        var problem = handler.onLocale(new UnsupportedLocaleException("it"));

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
        assertThat(problem.getProperties()).containsKey("supported");
        @SuppressWarnings("unchecked")
        var supported = (List<String>) problem.getProperties().get("supported");
        assertThat(supported).containsExactly("en", "es", "fr", "de");
    }

    @Test
    void unexpectedExceptionReturns500WithCorrelationIdButNoInternalDetail() {
        var problem = handler.onUnexpected(new RuntimeException("a secret internal detail"));

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR.value());
        assertThat(problem.getProperties()).containsKey("correlationId");
        assertThat(problem.getDetail()).isNull();
        assertThat(problem.getTitle()).doesNotContain("a secret internal detail");
    }
}
