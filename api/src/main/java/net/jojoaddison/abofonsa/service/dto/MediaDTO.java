package net.jojoaddison.abofonsa.service.dto;

import java.util.List;

/**
 * Flat, locale-resolved media reference (spec §7.4).
 *
 * <p>{@code variants} is what makes a responsive {@code srcset} possible on the public site: the
 * browser picks the narrowest rendition that still covers the slot it is painting into, which is
 * the single largest lever on LCP over a Ghanaian mobile connection (spec §13.1). Without the
 * widths crossing this boundary the frontend can only ever request the full-size image.
 *
 * <p>{@code blurHash} travels for the same reason — it lets the placeholder occupy the final
 * dimensions in roughly the right colour before any byte of the image arrives, so nothing shifts.
 */
public record MediaDTO(
        String id, String url, String alt, int width, int height, String blurHash, List<VariantDTO> variants) {

    /** One rendition. {@code contentType} is present so the frontend can group renditions into
     * {@code <source>} elements by format and let the browser pick the best one it understands. */
    public record VariantDTO(String label, int width, String url, String contentType) {}
}
