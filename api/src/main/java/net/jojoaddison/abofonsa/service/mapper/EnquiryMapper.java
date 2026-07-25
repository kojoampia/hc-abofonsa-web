package net.jojoaddison.abofonsa.service.mapper;

import java.util.List;
import net.jojoaddison.abofonsa.domain.Enquiry;
import net.jojoaddison.abofonsa.service.dto.EnquiryDTO;
import org.springframework.stereotype.Component;

/** Hand-written, per the no-reflection-mapping rule (spec §7.1). The {@code meta} block (ipHash,
 * userAgent) is deliberately not exposed — staff see the enquiry, not the tracking metadata. */
@Component
public class EnquiryMapper {

    public EnquiryDTO toDto(Enquiry enquiry) {
        List<EnquiryDTO.NoteDTO> notes = enquiry.notes() == null
                ? List.of()
                : enquiry.notes().stream()
                        .map(n -> new EnquiryDTO.NoteDTO(n.at(), n.by(), n.text()))
                        .toList();
        return new EnquiryDTO(
                enquiry.id(),
                enquiry.reference(),
                enquiry.name(),
                enquiry.phone(),
                enquiry.email(),
                enquiry.planOfInterest(),
                enquiry.relationship(),
                enquiry.message(),
                enquiry.locale(),
                enquiry.sourcePage(),
                enquiry.status(),
                enquiry.assignedTo(),
                notes,
                enquiry.createdAt());
    }
}
