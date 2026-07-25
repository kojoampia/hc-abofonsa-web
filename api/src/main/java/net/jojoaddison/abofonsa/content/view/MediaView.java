package net.jojoaddison.abofonsa.content.view;

/** Flat, locale-resolved media reference (spec §7.4). {@code null} until Phase 6 wires media
 * uploads and content editors start attaching images. */
public record MediaView(String id, String url, String alt, int width, int height, String blurHash) {}
