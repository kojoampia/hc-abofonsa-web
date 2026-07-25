package net.jojoaddison.abofonsa.content.view;

import java.util.List;

public record SectionView(
        String eyebrow, String heading, String subheading, String body, List<SectionItemView> items, MediaView image) {}
