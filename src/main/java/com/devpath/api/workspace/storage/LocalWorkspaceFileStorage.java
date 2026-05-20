package com.devpath.api.workspace.storage;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.workspace.entity.WorkspaceFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Component
public class LocalWorkspaceFileStorage implements WorkspaceFileStorage {

  private static final String PROVIDER = "LOCAL";

  @Value("${app.upload.dir:./uploads}")
  private String uploadBaseDir;

  @Override
  public String provider() {
    return PROVIDER;
  }

  @Override
  public StoredWorkspaceFile store(Long workspaceId, MultipartFile file) {
    if (file.isEmpty()) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    String originalName =
        StringUtils.hasText(file.getOriginalFilename()) ? file.getOriginalFilename() : "upload.bin";
    String safeOriginalName = sanitizeFileName(originalName);
    String storedFileName = UUID.randomUUID() + "_" + safeOriginalName;
    Path dirPath =
        Paths.get(uploadBaseDir).toAbsolutePath().normalize().resolve("workspace").resolve(
            String.valueOf(workspaceId));
    Path filePath = dirPath.resolve(storedFileName).normalize();

    if (!filePath.startsWith(dirPath)) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    try {
      Files.createDirectories(dirPath);
      Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
    } catch (IOException e) {
      throw new CustomException(ErrorCode.FILE_UPLOAD_FAILED);
    }

    return new StoredWorkspaceFile(
        PROVIDER,
        "workspace/" + workspaceId + "/" + storedFileName,
        storedFileName,
        filePath.toString(),
        file.getSize(),
        StringUtils.hasText(file.getContentType())
            ? file.getContentType()
            : "application/octet-stream");
  }

  @Override
  public Resource load(WorkspaceFile file) {
    try {
      Path path = Paths.get(file.getFilePath());
      Resource resource = new UrlResource(path.toUri());
      if (!resource.exists()) {
        throw new CustomException(ErrorCode.FILE_NOT_FOUND);
      }
      return resource;
    } catch (IOException e) {
      throw new CustomException(ErrorCode.FILE_NOT_FOUND);
    }
  }

  private String sanitizeFileName(String fileName) {
    String normalized = StringUtils.cleanPath(fileName).replace('\\', '/');
    int lastSlashIndex = normalized.lastIndexOf('/');
    String baseName = lastSlashIndex >= 0 ? normalized.substring(lastSlashIndex + 1) : normalized;
    String safeName = baseName.replaceAll("[\\r\\n]", "_").trim();

    if (!StringUtils.hasText(safeName) || safeName.contains("..")) {
      return "upload.bin";
    }

    return safeName;
  }
}
