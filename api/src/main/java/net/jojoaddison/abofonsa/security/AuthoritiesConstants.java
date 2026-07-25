package net.jojoaddison.abofonsa.security;

/** Constants for Spring Security authorities (spec §9.1 roles, JHipster naming convention). */
public final class AuthoritiesConstants {

    public static final String VIEWER = "ROLE_VIEWER";

    public static final String EDITOR = "ROLE_EDITOR";

    public static final String PUBLISHER = "ROLE_PUBLISHER";

    public static final String ADMIN = "ROLE_ADMIN";

    public static final String ANONYMOUS = "ROLE_ANONYMOUS";

    private AuthoritiesConstants() {}
}
