package net.jojoaddison.abofonsa.service.dto;

import jakarta.validation.constraints.Size;
import net.jojoaddison.abofonsa.domain.enumeration.EnquiryStatus;

/** PATCH body for the enquiry handling workflow (spec §7.5): a status transition, an optional
 * note, or both. */
public record EnquiryUpdateDTO(
        EnquiryStatus status,
        @Size(max = 2000) String note,
        @Size(max = 60) String assignedTo) {}
