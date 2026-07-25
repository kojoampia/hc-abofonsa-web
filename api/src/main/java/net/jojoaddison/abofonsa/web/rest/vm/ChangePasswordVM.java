package net.jojoaddison.abofonsa.web.rest.vm;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** View Model for the forced/voluntary password change (spec §8.2 {@code mustChangePassword}). */
public record ChangePasswordVM(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 12, max = 100) String newPassword) {}
