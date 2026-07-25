package net.jojoaddison.abofonsa.web.rest;

import java.security.Principal;
import java.util.List;
import net.jojoaddison.abofonsa.repository.MediaRepository;
import net.jojoaddison.abofonsa.service.MediaService;
import net.jojoaddison.abofonsa.service.dto.MediaAdminDTO;
import net.jojoaddison.abofonsa.service.mapper.MediaMapper;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** The media library API (spec §7.5, plan tasks 52-53). */
@RestController
public class MediaResource {

    private final MediaService mediaService;
    private final MediaRepository mediaRepository;
    private final MediaMapper mediaMapper;

    public MediaResource(MediaService mediaService, MediaRepository mediaRepository, MediaMapper mediaMapper) {
        this.mediaService = mediaService;
        this.mediaRepository = mediaRepository;
        this.mediaMapper = mediaMapper;
    }

    @PostMapping("/api/v1/admin/media")
    @PreAuthorize("hasRole('EDITOR')")
    public ResponseEntity<MediaAdminDTO> upload(@RequestParam("file") MultipartFile file, Principal principal) {
        var media = mediaService.upload(file, principal.getName());
        return ResponseEntity.status(201).body(mediaMapper.toDto(media));
    }

    @GetMapping("/api/v1/admin/media")
    @PreAuthorize("hasRole('VIEWER')")
    public ResponseEntity<List<MediaAdminDTO>> list(
            @RequestParam(defaultValue = "false") boolean orphans,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        if (orphans) {
            return ResponseEntity.ok(
                    mediaService.orphans().stream().map(mediaMapper::toDto).toList());
        }
        var result = mediaRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
        return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(result.getTotalElements()))
                .body(result.getContent().stream().map(mediaMapper::toDto).toList());
    }

    @DeleteMapping("/api/v1/admin/media/{id}")
    @PreAuthorize("hasRole('PUBLISHER')")
    public ResponseEntity<Void> delete(@PathVariable String id, Principal principal) {
        mediaService.delete(id, principal.getName());
        return ResponseEntity.noContent().build();
    }
}
