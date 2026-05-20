package com.devpath.api.workspace.dto;

import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.workspace.entity.WorkspaceFile;
import com.devpath.domain.workspace.entity.WorkspaceFileType;
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
  private Long parentId;
  private String itemType;
  private String originalFileName;
  private String displayName;
  private long fileSize;
  private String contentType;
  private String storageProvider;
  private String objectKey;
  private Long uploadedById;
  private String uploadedByName;
  private String uploaderProfileImage;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public static WorkspaceFileResponse from(WorkspaceFile file) {
    return from(file, null, null);
  }

  public static WorkspaceFileResponse from(WorkspaceFile file, User uploader, UserProfile profile) {
    return WorkspaceFileResponse.builder()
        .fileId(file.getId())
        .workspaceId(file.getWorkspaceId())
        .parentId(file.getParentId())
        .itemType(
            file.getItemType() == null ? WorkspaceFileType.FILE.name() : file.getItemType().name())
        .originalFileName(file.getOriginalFileName())
        .displayName(file.getOriginalFileName())
        .fileSize(file.getFileSize())
        .contentType(file.getContentType())
        .storageProvider(file.getStorageProvider())
        .objectKey(file.getObjectKey())
        .uploadedById(file.getUploadedById())
        .uploadedByName(uploader == null ? null : uploader.getName())
        .uploaderProfileImage(profile == null ? null : profile.getDisplayProfileImage())
        .createdAt(file.getCreatedAt())
        .updatedAt(file.getUpdatedAt())
        .build();
  }
}
