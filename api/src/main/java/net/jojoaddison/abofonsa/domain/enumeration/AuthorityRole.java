package net.jojoaddison.abofonsa.domain.enumeration;

/**
 * The clinical authorities a professional can be granted, mirroring step 9 of
 * {@code hc-professional/web/professional-onboarding-workflow.md}.
 *
 * <p>This site never grants an authority — it only advertises the tracks. The value travels in the
 * {@code track} query parameter of the handoff link so the choice a candidate made here does not
 * have to be re-asked on the other side, which means these names must stay identical to the
 * {@code ROLE_*} constants that repo authorizes against. Renaming one here silently breaks the
 * handoff rather than failing a build, so treat it as a shared contract.
 */
public enum AuthorityRole {
    ROLE_NURSE,
    ROLE_CARER,
    ROLE_DOCTOR,
    ROLE_PARAMEDIC,
    ROLE_PHARMACIST,
    ROLE_THERAPIST
}
