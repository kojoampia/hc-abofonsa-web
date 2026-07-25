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
        String onCallHours) {}
