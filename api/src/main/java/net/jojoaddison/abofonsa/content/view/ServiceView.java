package net.jojoaddison.abofonsa.content.view;

import java.util.List;

/** Flat, locale-resolved view of a {@link net.jojoaddison.abofonsa.content.ServiceDocument} — no
 * {@link net.jojoaddison.abofonsa.common.LocalizedText} crosses the API boundary (spec §7.4). */
public record ServiceView(
        String id,
        String slug,
        String name,
        String blurb,
        List<String> points,
        String availableOn,
        MediaView image,
        int displayOrder) {}
