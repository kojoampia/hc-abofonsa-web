package net.jojoaddison.abofonsa.web.rest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.net.URI;
import net.jojoaddison.abofonsa.service.EnquiryService;
import net.jojoaddison.abofonsa.service.dto.EnquiryReceiptDTO;
import net.jojoaddison.abofonsa.service.dto.EnquiryRequestDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Public enquiry intake (spec §7.4) — no account, no authentication, R8 holds. */
@RestController
public class EnquiryResource {

    private final EnquiryService enquiryService;

    public EnquiryResource(EnquiryService enquiryService) {
        this.enquiryService = enquiryService;
    }

    @PostMapping("/api/v1/enquiries")
    public ResponseEntity<EnquiryReceiptDTO> submit(
            @Valid @RequestBody EnquiryRequestDTO body, HttpServletRequest request) {
        var receipt = enquiryService.submit(body, clientIp(request), request.getHeader("User-Agent"));
        return ResponseEntity.created(URI.create("/api/v1/enquiries/" + receipt.reference()))
                .body(receipt);
    }

    /** First {@code X-Forwarded-For} hop when present (set by the Phase 20 nginx front), else the
     * socket address. Used only for the salted rate-limit hash — never stored raw. */
    private static String clientIp(HttpServletRequest request) {
        var forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
