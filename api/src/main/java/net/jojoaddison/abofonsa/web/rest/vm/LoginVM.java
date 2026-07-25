package net.jojoaddison.abofonsa.web.rest.vm;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** View Model for the login request (JHipster vm convention). */
public record LoginVM(
        @NotBlank @Size(min = 1, max = 50) String username,
        @NotBlank @Size(min = 4, max = 100) String password) {}
