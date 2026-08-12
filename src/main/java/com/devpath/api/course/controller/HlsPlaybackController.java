package com.devpath.api.course.controller;

import com.devpath.api.course.service.HlsPlaybackService;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/media/hls")
@RequiredArgsConstructor
public class HlsPlaybackController {

  private final HlsPlaybackService hlsPlaybackService;

  @GetMapping("/{lessonId}/{fileName:.+}")
  public ResponseEntity<byte[]> getAsset(
      @PathVariable Long lessonId,
      @PathVariable String fileName,
      @RequestParam long expires,
      @RequestParam String signature) {
    HlsPlaybackService.HlsAsset asset =
        hlsPlaybackService.loadAsset(lessonId, fileName, expires, signature);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.maxAge(Duration.ofMinutes(10)).cachePrivate())
        .contentType(MediaType.parseMediaType(asset.contentType()))
        .body(asset.body());
  }
}
