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
         * Where the landing page's "Create your account" button sends a family, or {@code null} to
         * hide it — the same withdrawal switch {@code professionalPortalUrl} is, for the same reason:
         * whether patient.abofonsa.com is answering is not something this build can know.
         *
         * <p>Seeded with a value, unlike its professional counterpart, because that host was serving
         * nothing when the careers page was built and this one is serving now. The default is a
         * default, not a constant — an editor can point it elsewhere or clear it.
         */
        String patientPortalUrl) {}
