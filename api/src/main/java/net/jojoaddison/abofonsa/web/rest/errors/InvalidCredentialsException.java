package net.jojoaddison.abofonsa.web.rest.errors;

/**
 * Thrown for any authentication failure — wrong password, unknown user, locked account, expired
 * or reused refresh token. One exception on purpose: the 401 it translates to never reveals
 * which case occurred (no username enumeration, no lockout confirmation).
 */
public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException(String internalReason) {
        super(internalReason);
    }
}
