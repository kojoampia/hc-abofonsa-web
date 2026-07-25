package net.jojoaddison.abofonsa.web.rest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import net.jojoaddison.abofonsa.service.AuthService;
import net.jojoaddison.abofonsa.service.dto.AuthTokensDTO;
import net.jojoaddison.abofonsa.web.rest.vm.LoginVM;
import net.jojoaddison.abofonsa.web.rest.vm.RefreshTokenVM;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller to authenticate users — hc-admin-gw's AuthenticateController shape, extended with
 * the refresh/logout endpoints this spec adds (§7.5). Named *Controller rather than *Resource to
 * mirror the fleet's JHipster-generated naming for exactly this class.
 */
@RestController
public class AuthenticateController {

    private final AuthService authService;

    public AuthenticateController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/api/v1/admin/auth/login")
    public ResponseEntity<AuthTokensDTO> login(@Valid @RequestBody LoginVM loginVM, HttpServletRequest request) {
        var tokens = authService.login(loginVM.username(), loginVM.password(), clientIp(request));
        var headers = new HttpHeaders();
        headers.setBearerAuth(tokens.accessToken());
        return ResponseEntity.ok().headers(headers).body(tokens);
    }

    @PostMapping("/api/v1/admin/auth/refresh")
    public AuthTokensDTO refresh(@Valid @RequestBody RefreshTokenVM body) {
        return authService.refresh(body.refreshToken());
    }

    @PostMapping("/api/v1/admin/auth/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody RefreshTokenVM body) {
        authService.logout(body.refreshToken());
        return ResponseEntity.noContent().build();
    }

    private static String clientIp(HttpServletRequest request) {
        var forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
