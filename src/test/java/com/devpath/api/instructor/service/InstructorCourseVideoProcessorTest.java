package com.devpath.api.instructor.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.devpath.domain.system.service.SystemPolicyService;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.time.Duration;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class InstructorCourseVideoProcessorTest {

  @TempDir Path uploadDirectory;

  @Test
  void keepsOriginalVideoWhenFfmpegIsUnavailable() throws Exception {
    SystemPolicyService policyService = mock(SystemPolicyService.class);
    when(policyService.currentPolicy())
        .thenReturn(new SystemPolicyService.Policy(0.15, 7, 0, true, "720p", true, 3));
    InstructorCourseVideoProcessor processor =
        new InstructorCourseVideoProcessor(
            policyService,
            uploadDirectory.resolve("missing-ffmpeg").toString(),
            Duration.ofSeconds(1),
            new SecureRandom());
    Path original = uploadDirectory.resolve("courses/1/lesson-video/lesson.mp4");
    Files.createDirectories(original.getParent());
    Files.writeString(original, "original-video");

    var result =
        processor.process(
            uploadDirectory,
            original,
            "courses/1/lesson-video/lesson.mp4",
            "lesson-video",
            "video/mp4");

    assertThat(result).isEmpty();
    assertThat(Files.readString(original)).isEqualTo("original-video");
    assertThat(original.resolveSibling("lesson_hls")).doesNotExist();
  }

  @Test
  void skipsNonLessonAssetsWithoutStartingFfmpeg() throws Exception {
    SystemPolicyService policyService = mock(SystemPolicyService.class);
    when(policyService.currentPolicy())
        .thenReturn(new SystemPolicyService.Policy(0.15, 7, 0, true, "1080p", true, 3));
    InstructorCourseVideoProcessor processor =
        new InstructorCourseVideoProcessor(
            policyService,
            uploadDirectory.resolve("missing-ffmpeg").toString(),
            Duration.ofSeconds(1),
            new SecureRandom());
    Path image = uploadDirectory.resolve("courses/1/thumbnail/cover.png");
    Files.createDirectories(image.getParent());
    Files.writeString(image, "image");

    var result =
        processor.process(
            uploadDirectory, image, "courses/1/thumbnail/cover.png", "thumbnail", "image/png");

    assertThat(result).isEmpty();
    assertThat(image.resolveSibling("cover_hls")).doesNotExist();
  }

  @Test
  void actualFfmpegProducesEncryptedHlsAndKeepsOriginal() throws Exception {
    String ffmpegPath = System.getenv("FFMPEG_PATH");
    Assumptions.assumeTrue(
        ffmpegPath != null && Files.isRegularFile(Path.of(ffmpegPath)),
        "FFMPEG_PATH가 있는 환경에서 실제 변환을 검증합니다.");

    Path original = uploadDirectory.resolve("courses/1/lesson-video/lesson.mp4");
    Files.createDirectories(original.getParent());
    Process sampleGenerator =
        new ProcessBuilder(
                ffmpegPath,
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-f",
                "lavfi",
                "-i",
                "testsrc=size=320x180:rate=24",
                "-t",
                "1",
                "-pix_fmt",
                "yuv420p",
                original.toString())
            .inheritIO()
            .start();
    assertThat(sampleGenerator.waitFor()).isZero();

    SystemPolicyService policyService = mock(SystemPolicyService.class);
    when(policyService.currentPolicy())
        .thenReturn(new SystemPolicyService.Policy(0.15, 7, 0, true, "720p", true, 3));
    InstructorCourseVideoProcessor processor =
        new InstructorCourseVideoProcessor(
            policyService, ffmpegPath, Duration.ofMinutes(1), new SecureRandom());

    var result =
        processor.process(
            uploadDirectory,
            original,
            "courses/1/lesson-video/lesson.mp4",
            "lesson-video",
            "video/mp4");

    assertThat(result).isPresent();
    Path playlist = uploadDirectory.resolve(result.orElseThrow().assetKey());
    String playlistContent = Files.readString(playlist);
    assertThat(playlistContent).contains("#EXT-X-KEY:METHOD=AES-128");
    assertThat(Files.size(playlist.resolveSibling("encryption.key"))).isEqualTo(16);
    try (var segments = Files.list(playlist.getParent())) {
      assertThat(segments.filter(path -> path.toString().endsWith(".ts")).toList()).isNotEmpty();
    }
    assertThat(original).exists();
  }
}
