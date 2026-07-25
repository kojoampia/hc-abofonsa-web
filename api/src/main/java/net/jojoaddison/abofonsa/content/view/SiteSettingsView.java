package net.jojoaddison.abofonsa.content.view;

import java.util.List;

public record SiteSettingsView(
        String organisationName,
        String tagline,
        List<String> phones,
        String whatsapp,
        String email,
        AddressView address,
        String coordinationHours,
        String onCallHours) {}
