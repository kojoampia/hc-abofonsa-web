package net.jojoaddison.abofonsa.security;

import org.springframework.security.core.AuthenticationException;

/** Thrown when authenticating a user whose account is deactivated (JHipster convention). */
public class UserNotActivatedException extends AuthenticationException {

    public UserNotActivatedException(String message) {
        super(message);
    }
}
