package net.jojoaddison.abofonsa.service.dto;

/** The token pair issued on login/refresh (spec §7.5). {@code mustChangePassword} tells the CMS
 * to route straight to the forced password-change screen. */
public record AuthTokensDTO(String accessToken, String refreshToken, boolean mustChangePassword) {}
