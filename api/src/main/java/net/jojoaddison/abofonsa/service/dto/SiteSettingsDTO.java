package net.jojoaddison.abofonsa.service.dto;

import java.util.List;

public record SiteSettingsDTO(
        String organisationName,
        String tagline,
        List<String> phones,
        String whatsapp,
        String email,
        AddressDTO address,
        String coordinationHours,
        String onCallHours,
        /**
         * Where the careers page's "Create your account" buttons point, or {@code null} to hide every
         * apply call-to-action on the page (careers-plan.md task 144).
         *
         * <p>This was a compiled-in constant until Phase C4, on the argument that the page's only
         * conversion should not depend on a content field somebody could mistype. Checking the
         * far side against reality reversed it: professional.abofonsa.com resolved but nothing
         * answered, so the constant meant the live site shipped eight buttons to a dead host, with no
         * way to withdraw them short of a release. Availability is not a build-time fact, so it does
         * not belong in the build.
         *
         * <p>The portal serves now and an editor has set this in the CMS (task 147), so the buttons
         * are live — and the seed here stays null, because that is the safe default for any database
         * created from scratch and the decision belongs to whoever can see whether the host is up.
         * Clearing the field withdraws every button again in one publish: the page keeps every track
         * and everything an applicant needs to prepare, and stops promising only the door.
         */
        String professionalPortalUrl,
        /**
         * Where "Request an invitation" points on the careers page, or {@code null} to hide that
         * call-to-action entirely (careers-plan.md D-1: enrolment is self-service primary, with the
         * invitation path switched on later).
         *
         * <p>An optional URL rather than the boolean the plan sketched, for the same cost. A boolean
         * can be switched on while the target does not exist — {@code /request-invitation} is not
         * built on professional.abofonsa.com yet — and would then send candidates to a 404. A URL
         * cannot be enabled without someone supplying the destination, so the switch and the thing
         * it switches to cannot drift apart.
         */
        String professionalInvitationUrl) {}
