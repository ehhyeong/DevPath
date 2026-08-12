package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.system.SystemHealthResponse;
import com.devpath.common.config.GeminiProperties;
import com.devpath.common.config.JobkoreaProperties;
import java.io.IOException;
import java.sql.Connection;
import java.time.LocalDateTime;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminSystemHealthService {

  private final DataSource dataSource;
  private final JobkoreaProperties jobkoreaProperties;
  private final GeminiProperties geminiProperties;

  @Value("${app.media.ffmpeg-path:ffmpeg}")
  private String ffmpegExecutable;

  public SystemHealthResponse checkHealth() {
    boolean databaseHealthy = false;
    try (Connection connection = dataSource.getConnection()) {
      databaseHealthy = connection.isValid(2);
    } catch (Exception ignored) {
      // 상태 API는 장애 중에도 응답해야 하므로 예외 대신 DEGRADED 상태를 반환한다.
    }
    return new SystemHealthResponse(
        databaseHealthy ? "NORMAL" : "DEGRADED",
        databaseHealthy ? "UP" : "DOWN",
        dependency(
            jobkoreaProperties.getJobListUrl(),
            "CONFIGURED",
            "잡코리아 수집 URL이 설정되었습니다.",
            "UNCONFIGURED",
            "잡코리아 URL이 없어 외부 수집은 실패로 반환됩니다."),
        dependency(
            geminiProperties.getKey(),
            "CONFIGURED",
            "Gemini 호출이 설정되어 있으며 실패 시 결정론적 폴백을 사용합니다.",
            "FALLBACK_ONLY",
            "Gemini 키가 없어 AI 기능은 비활성이고 결정론적 폴백만 사용합니다."),
        checkFfmpeg(),
        LocalDateTime.now());
  }

  private SystemHealthResponse.DependencyStatus dependency(
      String value,
      String configuredStatus,
      String configuredMessage,
      String missingStatus,
      String missingMessage) {
    return value != null && !value.isBlank()
        ? new SystemHealthResponse.DependencyStatus(configuredStatus, configuredMessage)
        : new SystemHealthResponse.DependencyStatus(missingStatus, missingMessage);
  }

  private SystemHealthResponse.DependencyStatus checkFfmpeg() {
    try {
      Process process =
          new ProcessBuilder(ffmpegExecutable, "-version").redirectErrorStream(true).start();
      boolean completed = process.waitFor(2, java.util.concurrent.TimeUnit.SECONDS);
      if (completed && process.exitValue() == 0) {
        return new SystemHealthResponse.DependencyStatus("AVAILABLE", "FFmpeg HLS 변환을 사용할 수 있습니다.");
      }
      if (!completed) {
        process.destroyForcibly();
      }
    } catch (IOException exception) {
      // 배포 환경에서 실행 파일이 없으면 업로드가 원본 MP4로 폴백하므로 상태만 명시한다.
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
    }
    return new SystemHealthResponse.DependencyStatus(
        "FALLBACK_ONLY", "FFmpeg를 사용할 수 없어 새 강의 영상은 원본 MP4로 폴백합니다.");
  }
}
