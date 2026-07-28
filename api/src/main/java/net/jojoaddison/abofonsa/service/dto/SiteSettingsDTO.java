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
