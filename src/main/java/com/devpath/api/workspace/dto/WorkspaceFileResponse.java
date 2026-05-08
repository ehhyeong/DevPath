package com.devpath.api.workspace.dto;

import com.devpath.domain.workspace.entity.WorkspaceFile;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class WorkspaceFileResponse {

  private Long fileId;
  private Long workspaceId;
  private String originalFileName;
  private long fileSize;
  private String contentType;
  private Long uploadedById;
  private LocalDateTime createdAt;

  public static WorkspaceFileResponse from(WorkspaceFile file) {
    return WorkspaceFileResponse.builder()
        .fileId(file.getId())
        .workspaceId(file.getWorkspaceId())
        .originalFileName(file.getOriginalFileName())
        .fileSize(file.getFileSize())
        .contentType(file.getContentType())
        .uploadedById(file.getUploadedById())
        .createdAt(file.getCreatedAt())
        .build();
  }
}
