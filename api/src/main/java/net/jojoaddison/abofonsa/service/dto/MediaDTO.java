package net.jojoaddison.abofonsa.service.dto;

/** Flat, locale-resolved media reference (spec §7.4). {@code null} until Phase 6 wires media
 * uploads and content editors start attaching images. */
public record MediaDTO(String id, String url, String alt, int width, int height, String blurHash) {}
