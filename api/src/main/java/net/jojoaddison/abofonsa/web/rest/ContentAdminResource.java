package net.jojoaddison.abofonsa.web.rest;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import net.jojoaddison.abofonsa.domain.enumeration.ContentType;
import net.jojoaddison.abofonsa.service.ContentAdminService;
import net.jojoaddison.abofonsa.service.ContentRevisionService;
import net.jojoaddison.abofonsa.service.PublishingService;
import net.jojoaddison.abofonsa.service.dto.ContentAdminDTO;
import net.jojoaddison.abofonsa.service.dto.ContentRevisionDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * The generic content CMS API (spec §7.5): {@code {type}} is one of
 * services|plans|testimonials|faqs|sections|settings, converted by {@code WebConfigurer}. Roles
 * per the §9.1 matrix — VIEWER reads, EDITOR drafts, PUBLISHER changes publication state.
 */
@RestController
public class ContentAdminResource {

    private final ContentAdminService contentAdminService;
    private final PublishingService publishingService;
    private final ContentRevisionService revisionService;

    public ContentAdminResource(
            ContentAdminService contentAdminService,
            PublishingService publishingService,
            ContentRevisionService revisionService) {
        this.contentAdminService = contentAdminService;
        this.publishingService = publishingService;
        this.revisionService = revisionService;
    }

    @GetMapping("/api/v1/admin/content/{type}")
    @PreAuthorize("hasRole('VIEWER')")
    public List<ContentAdminDTO> list(@PathVariable ContentType type) {
        return contentAdminService.list(type);
    }

    @GetMapping("/api/v1/admin/content/{type}/{id}")
    @PreAuthorize("hasRole('VIEWER')")
    public ContentAdminDTO get(@PathVariable ContentType type, @PathVariable String id) {
        return contentAdminService.get(type, id);
    }

    @PostMapping("/api/v1/admin/content/{type}")
    @PreAuthorize("hasRole('EDITOR')")
    public ResponseEntity<ContentAdminDTO> create(
            @PathVariable ContentType type, @RequestBody Map<String, Object> body, Principal principal) {
        var created = contentAdminService.create(type, body, principal.getName());
        return ResponseEntity.status(201).body(created);
    }

    /** The body carries {@code version} — the optimistic-lock token the client loaded (E-9). */
    @PutMapping("/api/v1/admin/content/{type}/{id}")
    @PreAuthorize("hasRole('EDITOR')")
    public ContentAdminDTO update(
            @PathVariable ContentType type,
            @PathVariable String id,
            @RequestBody Map<String, Object> body,
            Principal principal) {
        var version = body.get("version") instanceof Number n ? n.longValue() : 0L;
        return contentAdminService.update(type, id, body, version, principal.getName());
    }

    @PostMapping("/api/v1/admin/content/{type}/reorder")
    @PreAuthorize("hasRole('EDITOR')")
    public ResponseEntity<Void> reorder(
            @PathVariable ContentType type, @RequestBody List<String> orderedIds, Principal principal) {
        publishingService.reorder(type, orderedIds, principal.getName());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/v1/admin/content/{type}/{id}/publish")
    @PreAuthorize("hasRole('PUBLISHER')")
    public ResponseEntity<Void> publish(@PathVariable ContentType type, @PathVariable String id, Principal principal) {
        publishingService.publish(type, id, principal.getName());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/v1/admin/content/{type}/{id}/unpublish")
    @PreAuthorize("hasRole('PUBLISHER')")
    public ResponseEntity<Void> unpublish(
            @PathVariable ContentType type, @PathVariable String id, Principal principal) {
        publishingService.unpublish(type, id, principal.getName());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/api/v1/admin/content/{type}/{id}")
    @PreAuthorize("hasRole('PUBLISHER')")
    public ResponseEntity<Void> archive(@PathVariable ContentType type, @PathVariable String id, Principal principal) {
        publishingService.archive(type, id, principal.getName());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/v1/admin/content/{type}/{id}/revisions")
    @PreAuthorize("hasRole('VIEWER')")
    public List<ContentRevisionDTO> revisions(@PathVariable ContentType type, @PathVariable String id) {
        return revisionService.history(type, id).stream()
                .map(r -> new ContentRevisionDTO(
                        r.revisionNumber(),
                        r.status().name(),
                        r.changeSummary(),
                        r.createdAt(),
                        r.createdBy(),
                        ContentAdminService.jsonSafe(r.snapshot())))
                .toList();
    }

    @PostMapping("/api/v1/admin/content/{type}/{id}/revisions/{rev}/restore")
    @PreAuthorize("hasRole('PUBLISHER')")
    public ResponseEntity<Void> restore(
            @PathVariable ContentType type, @PathVariable String id, @PathVariable int rev, Principal principal) {
        publishingService.restore(type, id, rev, principal.getName());
        return ResponseEntity.noContent().build();
    }
}
