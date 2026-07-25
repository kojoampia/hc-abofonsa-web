package net.jojoaddison.abofonsa.web.rest;

import jakarta.validation.Valid;
import net.jojoaddison.abofonsa.security.SecurityUtils;
import net.jojoaddison.abofonsa.service.AuthService;
import net.jojoaddison.abofonsa.web.rest.errors.InvalidCredentialsException;
import net.jojoaddison.abofonsa.web.rest.vm.ChangePasswordVM;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Account self-service (JHipster's AccountResource shape) — currently just the password change
 * that clears the {@code mustChangePassword} gate (plan.md task 40). */
@RestController
public class AccountResource {

    private final AuthService authService;

    public AccountResource(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/api/v1/admin/account/change-password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordVM body) {
        var username = SecurityUtils.getCurrentUserLogin()
                .orElseThrow(() -> new InvalidCredentialsException("no authenticated user"));
        authService.changePassword(username, body.currentPassword(), body.newPassword());
        return ResponseEntity.noContent().build();
    }
}
