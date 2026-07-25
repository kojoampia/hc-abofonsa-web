package net.jojoaddison.abofonsa.web.rest;

import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import net.jojoaddison.abofonsa.domain.enumeration.EnquiryStatus;
import net.jojoaddison.abofonsa.service.EnquiryService;
import net.jojoaddison.abofonsa.service.dto.EnquiryDTO;
import net.jojoaddison.abofonsa.service.dto.EnquiryUpdateDTO;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Staff enquiry inbox (spec §7.5). The {@code @PreAuthorize} rules are declared now but only
 * enforced once Phase 5 enables method security and JWT authentication — until then the whole
 * {@code /api/v1/admin/**} surface already rejects unauthenticated requests at the filter chain.
 */
@RestController
public class EnquiryAdminResource {

    private final EnquiryService enquiryService;

    public EnquiryAdminResource(EnquiryService enquiryService) {
        this.enquiryService = enquiryService;
    }

    @GetMapping("/api/v1/admin/enquiries")
    @PreAuthorize("hasRole('VIEWER')")
    public ResponseEntity<List<EnquiryDTO>> list(
            @RequestParam(required = false) EnquiryStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var result = enquiryService.list(status, PageRequest.of(page, size));
        return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(result.getTotalElements()))
                .body(result.getContent());
    }

    @PatchMapping("/api/v1/admin/enquiries/{id}")
    @PreAuthorize("hasRole('EDITOR')")
    public EnquiryDTO update(@PathVariable String id, @Valid @RequestBody EnquiryUpdateDTO body, Principal principal) {
        return enquiryService.update(id, body, principal == null ? "unknown" : principal.getName());
    }

    @DeleteMapping("/api/v1/admin/enquiries/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable String id, Principal principal) {
        enquiryService.delete(id, principal == null ? "unknown" : principal.getName());
        return ResponseEntity.noContent().build();
    }
}
