package net.jojoaddison.abofonsa.web.rest;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Map;
import javax.imageio.ImageIO;
import net.jojoaddison.abofonsa.AbstractIntegrationTest;
import net.jojoaddison.abofonsa.domain.enumeration.AdminRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;

/** Plan tasks 52-53: upload pipeline (magic bytes, variants, blurhash) and reference-guarded
 * deletion. */
class MediaResourceTest extends AbstractIntegrationTest {

    private String editorToken;
    private String publisherToken;

    @BeforeEach
    void tokens() {
        editorToken = accessTokenFor("media-editor", "correct-horse-battery", AdminRole.EDITOR);
        publisherToken = accessTokenFor("media-publisher", "correct-horse-battery", AdminRole.PUBLISHER);
    }

    private static byte[] jpegBytes(int width, int height) throws Exception {
        var image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        var graphics = image.createGraphics();
        graphics.setPaint(new java.awt.GradientPaint(0, 0, java.awt.Color.ORANGE, width, height, java.awt.Color.BLUE));
        graphics.fillRect(0, 0, width, height);
        graphics.dispose();
        var out = new ByteArrayOutputStream();
        ImageIO.write(image, "jpeg", out);
        return out.toByteArray();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> upload(byte[] bytes, String filename) {
        var parts = new LinkedMultiValueMap<String, Object>();
        parts.add("file", new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        });
        return restClient
                .post()
                .uri("/api/v1/admin/media")
                .header("Authorization", "Bearer " + editorToken)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(parts)
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody(Map.class)
                .returnResult()
                .getResponseBody();
    }

    @Test
    void jpegUploadProducesThreeVariantsABlurHashAndNoReferences() throws Exception {
        var media = upload(jpegBytes(1600, 1000), "hero test image.jpg");

        assertThat((String) media.get("blurHash")).isNotBlank();
        assertThat((java.util.List<?>) media.get("variants")).hasSize(3);
        assertThat((java.util.List<?>) media.get("referencedBy")).isEmpty();
        // Original 1600px wide, full variant capped at 1180 (spec §13.1 hero width).
        @SuppressWarnings("unchecked")
        var variants = (java.util.List<Map<String, Object>>) media.get("variants");
        assertThat(variants)
                .anyMatch(v -> v.get("label").equals("full") && ((Number) v.get("width")).intValue() == 1180)
                .anyMatch(v -> v.get("label").equals("thumb") && ((Number) v.get("width")).intValue() == 320);
        // The stored filename is sanitised.
        assertThat((String) media.get("filename")).doesNotContain(" ");
    }

    /**
     * The URL an upload reports must actually serve the bytes, to an anonymous visitor. Both halves
     * of that were broken and neither was visible from the API alone: the mapper prefixed
     * {@code /media/} onto a storage key that already began with it, and {@code /media/**} was never
     * permitted, so it fell through to {@code denyAll()}. Published pages reference these URLs, so
     * the failure mode was every image on the public site 401ing.
     */
    @Test
    @SuppressWarnings("unchecked")
    void theReportedUrlServesTheImageToAnAnonymousVisitor() throws Exception {
        var media = upload(jpegBytes(800, 600), "public-image.jpg");

        var url = (String) media.get("url");
        assertThat(url).startsWith("/media/").doesNotContain("/media/media/");

        restClient
                .get()
                .uri(url)
                .exchange()
                .expectStatus()
                .isOk()
                .expectHeader()
                .contentType(MediaType.IMAGE_JPEG);

        for (var variant : (java.util.List<Map<String, Object>>) media.get("variants")) {
            restClient
                    .get()
                    .uri((String) variant.get("url"))
                    .exchange()
                    .expectStatus()
                    .isOk();
        }
    }

    @Test
    void nonImageUploadIsRejected() {
        var parts = new LinkedMultiValueMap<String, Object>();
        parts.add("file", new ByteArrayResource("#!/bin/sh\necho pwned".getBytes()) {
            @Override
            public String getFilename() {
                return "innocent.jpg"; // the extension lies; magic bytes decide (spec §7.7)
            }
        });
        restClient
                .post()
                .uri("/api/v1/admin/media")
                .header("Authorization", "Bearer " + editorToken)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(parts)
                .exchange()
                .expectStatus()
                .isBadRequest();
    }

    @Test
    void deletingAnOrphanWorksButAReferencedAssetIsRefused() throws Exception {
        var orphan = upload(jpegBytes(400, 300), "orphan.jpg");
        restClient
                .delete()
                .uri("/api/v1/admin/media/" + orphan.get("id"))
                .header("Authorization", "Bearer " + publisherToken)
                .exchange()
                .expectStatus()
                .isNoContent();

        // Upload another and reference it from a new service - deletion must then be refused.
        var referenced = upload(jpegBytes(400, 300), "referenced.jpg");
        @SuppressWarnings("unchecked")
        var service = (Map<String, Object>) restClient
                .post()
                .uri("/api/v1/admin/content/services")
                .header("Authorization", "Bearer " + editorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "slug",
                        "media-reference-test",
                        "name",
                        Map.of("en", "Media reference test"),
                        "imageId",
                        referenced.get("id"),
                        "displayOrder",
                        97))
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody(Map.class)
                .returnResult()
                .getResponseBody();

        restClient
                .delete()
                .uri("/api/v1/admin/media/" + referenced.get("id"))
                .header("Authorization", "Bearer " + publisherToken)
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.referencedBy[0].entityType")
                .isEqualTo("SERVICE");

        // Cleanup: archive the service (references remain by design - archive is soft).
        restClient
                .delete()
                .uri("/api/v1/admin/content/services/" + service.get("id"))
                .header("Authorization", "Bearer " + publisherToken)
                .exchange()
                .expectStatus()
                .isNoContent();
    }

    @Test
    void orphanReportListsOnlyUnreferencedAssets() throws Exception {
        var media = upload(jpegBytes(200, 150), "orphan-report.jpg");
        var orphans = restClient
                .get()
                .uri("/api/v1/admin/media?orphans=true")
                .header("Authorization", "Bearer " + editorToken)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(Map[].class)
                .returnResult()
                .getResponseBody();
        assertThat(orphans).anyMatch(m -> m.get("id").equals(media.get("id")));

        restClient
                .delete()
                .uri("/api/v1/admin/media/" + media.get("id"))
                .header("Authorization", "Bearer " + publisherToken)
                .exchange()
                .expectStatus()
                .isNoContent();
    }
}
