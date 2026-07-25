package net.jojoaddison.abofonsa.service.dto;

import java.util.List;

public record SectionDTO(
        String eyebrow, String heading, String subheading, String body, List<SectionItemDTO> items, MediaDTO image) {}
