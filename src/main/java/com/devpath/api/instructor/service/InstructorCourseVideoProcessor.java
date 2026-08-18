package com.devpath.api.instructor.service;

import com.devpath.domain.system.service.SystemPolicyService;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Slf4j
@Component
class InstructorCourseVideoProcessor {

  private static final String LESSON_VIDEO_ASSET_TYPE = "lesson-video";
  private static final int AES_KEY_BYTES = 16;

  private final SystemPolicyService systemPolicyService;
  private final String ffmpegExecutable;
  private final Duration timeout;
  private final SecureRandom secureRandom;

  @Autowired
  InstructorCourseVideoProcessor(
      SystemPolicyService systemPolicyService,
      @Value("${app.media.ffmpeg-path:ffmpeg}") String ffmpegExecutable,
      @Value("${app.media.transcoding-timeout:10m}") Duration timeout) {
    this(systemPolicyService, ffmpegExecutable, timeout, new SecureRandom());
  }

  InstructorCourseVideoProcessor(
      SystemPolicyService systemPolicyService,
      String ffmpegExecutable,
      Duration timeout,
      SecureRandom secureRandom) {
    this.systemPolicyService = systemPolicyService;
    this.ffmpegExecutable = ffmpegExecutable;
    this.timeout = timeout;
    this.secureRandom = secureRandom;
  }

  Optional<ProcessedVideo> process(
      Path uploadRoot,
      Path originalPath,
      String originalAssetKey,
      String assetType,
      String contentType) {
    SystemPolicyService.Policy policy = systemPolicyService.currentPolicy();
    if (!policy.hlsEncrypted() || !isLessonVideo(assetType, contentType, originalPath)) {
      return Optional.empty();
    }

    Path outputDirectory = createOutputDirectory(originalPath);
    if (!outputDirectory.startsWith(uploadRoot)) {
      return Optional.empty();
    }

    Path playlistPath = outputDirectory.resolve("index.m3u8");
    Path keyPath = outputDirectory.resolve("encryption.key");
    Path keyInfoPath = outputDirectory.resolve("encryption.keyinfo");
    Path logPath = outputDirectory.resolve("ffmpeg.log");

    try {
      Files.createDirectories(outputDirectory);
      writeEncryptionFiles(uploadRoot, keyPath, keyInfoPath);

      Process process =
          new ProcessBuilder(
                  buildCommand(
                      originalPath,
                      outputDirectory,
                      playlistPath,
                      keyInfoPath,
                      policy.maxResolution()))
              .redirectErrorStream(true)
              .redirectOutput(logPath.toFile())
              .start();

      boolean completed = process.waitFor(timeout.toMillis(), TimeUnit.MILLISECONDS);
      if (!completed) {
        process.destroyForcibly();
        log.warn("강의 영상 HLS 변환 시간이 초과되었습니다. assetKey={}", originalAssetKey);
        cleanupFailedOutput(outputDirectory);
        return Optional.empty();
      }
      if (process.exitValue() != 0 || !isCompleteOutput(outputDirectory, playlistPath)) {
        log.warn(
            "강의 영상 HLS 변환에 실패했습니다. assetKey={}, exitCode={}, output={}",
            originalAssetKey,
            process.exitValue(),
            readLog(logPath));
        cleanupFailedOutput(outputDirectory);
        return Optional.empty();
      }

      Files.deleteIfExists(keyInfoPath);
      Files.deleteIfExists(logPath);
      String playlistAssetKey = uploadRoot.relativize(playlistPath).toString().replace('\\', '/');
      return Optional.of(
          new ProcessedVideo(
              "/uploads/" + playlistAssetKey,
              playlistAssetKey,
              playlistPath.getFileName().toString(),
              Files.size(playlistPath)));
    } catch (IOException exception) {
      // 변환기 누락이나 코덱 오류가 기존 MP4 업로드를 막지 않도록 원본으로 폴백한다.
      log.warn("강의 영상 HLS 변환기를 실행하지 못했습니다. 원본 영상을 사용합니다. assetKey={}", originalAssetKey, exception);
      cleanupFailedOutput(outputDirectory);
      return Optional.empty();
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      cleanupFailedOutput(outputDirectory);
      return Optional.empty();
    }
  }

  private List<String> buildCommand(
      Path originalPath,
      Path outputDirectory,
      Path playlistPath,
      Path keyInfoPath,
      String maxResolution) {
    List<String> command = new ArrayList<>();
    command.add(ffmpegExecutable);
    command.addAll(
        List.of(
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            originalPath.toString(),
            "-map",
            "0:v:0",
            "-map",
            "0:a:0?",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "23",
            "-c:a",
            "aac",
            "-b:a",
            "128k"));

    Integer maxHeight = parseResolutionHeight(maxResolution);
    if (maxHeight != null) {
      command.add("-vf");
      command.add("scale=-2:min(" + maxHeight + "\\,ih)");
    }

    command.addAll(
        List.of(
            "-hls_time",
            "6",
            "-hls_playlist_type",
            "vod",
            "-hls_key_info_file",
            keyInfoPath.toString(),
            "-hls_segment_filename",
            outputDirectory.resolve("segment_%05d.ts").toString(),
            playlistPath.toString()));
    return command;
  }

  private void writeEncryptionFiles(Path uploadRoot, Path keyPath, Path keyInfoPath)
      throws IOException {
    byte[] key = new byte[AES_KEY_BYTES];
    secureRandom.nextBytes(key);
    Files.write(keyPath, key);

    String keyAssetPath = uploadRoot.relativize(keyPath).toString().replace('\\', '/');
    String keyInfo =
        "/uploads/"
            + keyAssetPath
            + System.lineSeparator()
            + keyPath.toAbsolutePath().toString().replace('\\', '/');
    Files.writeString(keyInfoPath, keyInfo, StandardCharsets.UTF_8);
  }

  private boolean isLessonVideo(String assetType, String contentType, Path originalPath) {
    if (!LESSON_VIDEO_ASSET_TYPE.equals(assetType)) {
      return false;
    }
    if (contentType != null && contentType.toLowerCase(Locale.ROOT).startsWith("video/")) {
      return true;
    }
    String fileName = originalPath.getFileName().toString().toLowerCase(Locale.ROOT);
    return fileName.endsWith(".mp4")
        || fileName.endsWith(".mov")
        || fileName.endsWith(".mkv")
        || fileName.endsWith(".webm");
  }

  private Path createOutputDirectory(Path originalPath) {
    String fileName = originalPath.getFileName().toString();
    int extensionIndex = fileName.lastIndexOf('.');
    String baseName = extensionIndex > 0 ? fileName.substring(0, extensionIndex) : fileName;
    return originalPath.resolveSibling(baseName + "_hls").normalize();
  }

  private Integer parseResolutionHeight(String maxResolution) {
    if (maxResolution == null) {
      return null;
    }
    String digits = maxResolution.toLowerCase(Locale.ROOT).replaceAll("[^0-9]", "");
    if (digits.isBlank()) {
      return null;
    }
    try {
      int height = Integer.parseInt(digits);
      return height > 0 ? height : null;
    } catch (NumberFormatException ignored) {
      return null;
    }
  }

  private boolean isCompleteOutput(Path outputDirectory, Path playlistPath) throws IOException {
    if (!Files.isRegularFile(playlistPath)
        || !Files.isRegularFile(outputDirectory.resolve("encryption.key"))) {
      return false;
    }
    try (var paths = Files.list(outputDirectory)) {
      return paths.anyMatch(
          path ->
              path.getFileName().toString().startsWith("segment_")
                  && path.toString().endsWith(".ts"));
    }
  }

  private String readLog(Path logPath) {
    try {
      return Files.exists(logPath) ? Files.readString(logPath, StandardCharsets.UTF_8).strip() : "";
    } catch (IOException ignored) {
      return "";
    }
  }

  private void cleanupFailedOutput(Path outputDirectory) {
    if (!Files.exists(outputDirectory)) {
      return;
    }
    try (var paths = Files.walk(outputDirectory)) {
      paths.sorted(Comparator.reverseOrder()).forEach(this::deleteQuietly);
    } catch (IOException exception) {
      log.warn("실패한 HLS 변환 파일을 정리하지 못했습니다. path={}", outputDirectory, exception);
    }
  }

  private void deleteQuietly(Path path) {
    try {
      Files.deleteIfExists(path);
    } catch (IOException exception) {
      log.warn("HLS 임시 파일을 삭제하지 못했습니다. path={}", path, exception);
    }
  }

  record ProcessedVideo(String url, String assetKey, String storedFileName, long fileSize) {}
}
