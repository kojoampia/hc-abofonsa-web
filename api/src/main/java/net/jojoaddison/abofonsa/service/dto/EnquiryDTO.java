package net.jojoaddison.abofonsa.service.dto;

import java.time.Instant;
import java.util.List;
import net.jojoaddison.abofonsa.domain.enumeration.EnquiryStatus;

/** Staff-facing view of an enquiry (spec §7.5 admin API). Includes the sensitive free-text
 * {@code message} — admin endpoints only, never the public API. */
public record EnquiryDTO(
        String id,
        String reference,
        String name,
        String phone,
        String email,
        String planOfInterest,
        String relationship,
        String message,
        String locale,
        String sourcePage,
        EnquiryStatus status,
        String assignedTo,
        List<NoteDTO> notes,
        Instant createdAt) {

    public record NoteDTO(Instant at, String by, String text) {}
}
