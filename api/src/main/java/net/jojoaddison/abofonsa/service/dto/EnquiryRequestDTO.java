package net.jojoaddison.abofonsa.service.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * The public consultation-form payload (spec §7.4). Two anti-abuse fields beyond the spec's
 * record: {@code company} is a honeypot (hidden in the real form; any non-blank value marks the
 * submission as spam) and {@code dwellMs} is the time the form was on screen before submission
 * (below a minimum marks it as spam) — both mandated by spec §7.7's enquiry-abuse row.
 * {@code consent} is the explicit unticked checkbox §13.3 requires as lawful basis.
 */
public record EnquiryRequestDTO(
        @NotBlank @Size(max = 120) String name,

        @NotBlank @Size(max = 40) @Pattern(regexp = "^[0-9+()\\-.\\s]{7,40}$")
        String phone,

        @Email @Size(max = 160) String email,
        @Size(max = 40) String planOfInterest,
        @Size(max = 60) String relationship,
        @Size(max = 4000) String message,
        @Size(max = 10) String locale,
        @Size(max = 200) String sourcePage,
        @AssertTrue(message = "consent is required") boolean consent,
        String company,
        Long dwellMs) {}
