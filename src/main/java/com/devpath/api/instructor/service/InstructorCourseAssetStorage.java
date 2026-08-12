package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.InstructorCourseDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
class InstructorCourseAssetStorage {

  private final String uploadBaseDir;
  private final InstructorCourseVideoProcessor videoProcessor;

  InstructorCourseAssetStorage(
      @Value("${app.upload.dir:./uploads}") String uploadBaseDir,
      InstructorCourseVideoProcessor videoProcessor) {
    this.uploadBaseDir = uploadBaseDir;
    this.videoProcessor = videoProcessor;
  }

  InstructorCourseDto.UploadedAssetResponse store(
      Long instructorId, MultipartFile file, String assetType) {
    if (file == null || file.isEmpty()) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    String safeAssetType = sanitizePathSegment(assetType);
    String originalFileName = sanitizeFileName(file.getOriginalFilename());
    String storedFileName = UUID.randomUUID() + "_" + originalFileName;
    String assetKey = "courses/" + instructorId + "/" + safeAssetType + "/" + storedFileName;
    Path uploadRoot = Paths.get(uploadBaseDir).toAbsolutePath().normalize();
    Path targetPath = uploadRoot.resolve(assetKey).normalize();

    if (!targetPath.startsWith(uploadRoot)) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    try {
      Files.createDirectories(targetPath.getParent());
      file.transferTo(targetPath);
    } catch (IOException exception) {
      throw new CustomException(ErrorCode.FILE_UPLOAD_FAILED);
    }

    String normalizedAssetKey = assetKey.replace("\\", "/");
    Optional<InstructorCourseVideoProcessor.ProcessedVideo> processedVideo =
        videoProcessor.process(
            uploadRoot, targetPath, normalizedAssetKey, safeAssetType, file.getContentType());
    String resultUrl =
        processedVideo
            .map(InstructorCourseVideoProcessor.ProcessedVideo::url)
            .orElse("/uploads/" + normalizedAssetKey);
    String resultAssetKey =
        processedVideo
            .map(InstructorCourseVideoProcessor.ProcessedVideo::assetKey)
            .orElse(normalizedAssetKey);
    String resultStoredFileName =
        processedVideo
            .map(InstructorCourseVideoProcessor.ProcessedVideo::storedFileName)
            .orElse(storedFileName);
    String resultContentType =
        processedVideo.isPresent() ? "application/vnd.apple.mpegurl" : file.getContentType();
    long resultFileSize =
        processedVideo
            .map(InstructorCourseVideoProcessor.ProcessedVideo::fileSize)
            .orElse(file.getSize());
    return InstructorCourseDto.UploadedAssetResponse.builder()
        .url(resultUrl)
        .assetKey(resultAssetKey)
        .originalFileName(originalFileName)
        .storedFileName(resultStoredFileName)
        .contentType(resultContentType)
        .fileSize(resultFileSize)
        .originalUrl("/uploads/" + normalizedAssetKey)
        .originalAssetKey(normalizedAssetKey)
        .transcoded(processedVideo.isPresent())
        .build();
  }

  private String sanitizePathSegment(String value) {
    if (value == null || value.isBlank()) {
      return "misc";
    }

    String sanitized =
        value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_-]", "-").replaceAll("-+", "-");
    return sanitized.isBlank() ? "misc" : sanitized;
  }

  private String sanitizeFileName(String value) {
    String fileName = value == null ? "asset" : Paths.get(value).getFileName().toString();
    String sanitized = fileName.replaceAll("[^a-zA-Z0-9._-]", "_");
    return sanitized.isBlank() ? "asset" : sanitized;
  }
}
