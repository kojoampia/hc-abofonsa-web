package net.jojoaddison.abofonsa.web.rest.vm;

import jakarta.validation.constraints.NotBlank;

/** View Model carrying a refresh token for rotation or revocation. */
public record RefreshTokenVM(@NotBlank String refreshToken) {}
