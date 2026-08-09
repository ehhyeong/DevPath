package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceArchivePreviewResponse;
import com.devpath.api.workspace.dto.WorkspaceDocumentPreviewResponse;
import com.devpath.api.workspace.dto.WorkspaceFileResponse;
import com.devpath.api.workspace.dto.WorkspaceFileStorageSummaryResponse;
import com.devpath.api.workspace.preview.WorkspaceFilePreviewer;
import com.devpath.api.workspace.storage.StoredWorkspaceFile;
import com.devpath.api.workspace.storage.WorkspaceFileStorage;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.entity.WorkspaceFile;
import com.devpath.domain.workspace.entity.WorkspaceFileType;
import com.devpath.domain.workspace.repository.WorkspaceFileRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceFileService {

  private final WorkspaceFileRepository workspaceFileRepository;
  private final WorkspaceRepository workspaceRepository;
  private final WorkspaceMemberRepository workspaceMemberRepository;
  private final UserRepository userRepository;
  private final UserProfileRepository userProfileRepository;
  private final WorkspaceFileStorage workspaceFileStorage;
  private final WorkspaceFilePreviewer workspaceFilePreviewer;

  @Value("${app.storage.workspace.quota-bytes:5368709120}")
  private long workspaceStorageQuotaBytes;

  @Transactional
  public WorkspaceFileResponse uploadFile(Long workspaceId, Long userId, MultipartFile file) {
    return uploadFile(workspaceId, userId, null, file);
  }

  @Transactional
  public WorkspaceFileResponse uploadFile(
      Long workspaceId, Long userId, Long parentId, MultipartFile file) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);
    validateParentFolder(workspaceId, parentId);

    StoredWorkspaceFile storedFile = workspaceFileStorage.store(workspaceId, file);
    String originalFileName =
        StringUtils.hasText(file.getOriginalFilename()) ? file.getOriginalFilename() : "upload.bin";

    WorkspaceFile workspaceFile =
        WorkspaceFile.builder()
            .workspaceId(workspaceId)
            .parentId(parentId)
            .itemType(WorkspaceFileType.FILE)
            .originalFileName(originalFileName)
            .storedFileName(storedFile.storedFileName())
            .filePath(storedFile.filePath())
            .fileSize(storedFile.fileSize())
            .contentType(storedFile.contentType())
            .storageProvider(storedFile.storageProvider())
            .objectKey(storedFile.objectKey())
            .uploadedById(userId)
            .build();

    return toResponse(workspaceFileRepository.save(workspaceFile));
  }

  @Transactional
  public WorkspaceFileResponse createFolder(
      Long workspaceId, Long userId, String name, Long parentId) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);
    validateParentFolder(workspaceId, parentId);

    if (!StringUtils.hasText(name)) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    WorkspaceFile folder =
        WorkspaceFile.builder()
            .workspaceId(workspaceId)
            .parentId(parentId)
            .itemType(WorkspaceFileType.FOLDER)
            .originalFileName(name.trim())
            .storedFileName("")
            .filePath("")
            .fileSize(0)
            .contentType(null)
            .storageProvider(workspaceFileStorage.provider())
            .objectKey(null)
            .uploadedById(userId)
            .build();

    return toResponse(workspaceFileRepository.save(folder));
  }

  @Transactional
  public WorkspaceFileResponse createLink(
      Long workspaceId, Long userId, String title, String url, Long parentId) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);
    validateParentFolder(workspaceId, parentId);

    if (!StringUtils.hasText(title) || !StringUtils.hasText(url)) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    String normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    WorkspaceFile link =
        WorkspaceFile.builder()
            .workspaceId(workspaceId)
            .parentId(parentId)
            .itemType(WorkspaceFileType.LINK)
            .originalFileName(title.trim())
            .storedFileName("")
            .filePath("")
            .fileSize(0)
            .contentType("text/uri-list")
            .storageProvider("LINK")
            .objectKey(normalizedUrl)
            .uploadedById(userId)
            .build();

    return toResponse(workspaceFileRepository.save(link));
  }

  public List<WorkspaceFileResponse> getFiles(Long workspaceId, Long userId) {
    return getFiles(workspaceId, userId, null);
  }

  public List<WorkspaceFileResponse> getFiles(Long workspaceId, Long userId, Long parentId) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);
    validateParentFolder(workspaceId, parentId);

    List<WorkspaceFile> files =
        parentId == null
            ? workspaceFileRepository
                .findAllByWorkspaceIdAndParentIdIsNullAndIsDeletedFalseOrderByCreatedAtDesc(
                    workspaceId)
            : workspaceFileRepository
                .findAllByWorkspaceIdAndParentIdAndIsDeletedFalseOrderByCreatedAtDesc(
                    workspaceId, parentId);

    return toResponses(files);
  }

  public WorkspaceFileStorageSummaryResponse getStorageSummary(Long workspaceId, Long userId) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);

    long usedBytes =
        workspaceFileRepository
            .findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(workspaceId)
            .stream()
            .filter(file -> file.getItemType() == WorkspaceFileType.FILE)
            .mapToLong(WorkspaceFile::getFileSize)
            .sum();

    return WorkspaceFileStorageSummaryResponse.builder()
        .usedBytes(usedBytes)
        .quotaBytes(workspaceStorageQuotaBytes)
        .storageProvider(workspaceFileStorage.provider())
        .build();
  }

  public Resource downloadFile(Long fileId, Long userId) {
    WorkspaceFile workspaceFile = getFileEntity(fileId);
    validateMember(workspaceFile.getWorkspaceId(), userId);

    if (workspaceFile.isFolder()) {
      throw new CustomException(ErrorCode.FILE_NOT_FOUND);
    }

    return workspaceFileStorage.load(workspaceFile);
  }

  public String getOriginalFileName(Long fileId) {
    return getFileEntity(fileId).getOriginalFileName();
  }

  public String getContentType(Long fileId) {
    return getFileEntity(fileId).getContentType();
  }

  public WorkspaceArchivePreviewResponse getArchivePreview(Long fileId, Long userId) {
    WorkspaceFile workspaceFile = getFileEntity(fileId);
    validateMember(workspaceFile.getWorkspaceId(), userId);
    return workspaceFilePreviewer.getArchivePreview(workspaceFile);
  }

  public WorkspaceDocumentPreviewResponse getDocumentPreview(Long fileId, Long userId) {
    WorkspaceFile workspaceFile = getFileEntity(fileId);
    validateMember(workspaceFile.getWorkspaceId(), userId);
    return workspaceFilePreviewer.getDocumentPreview(workspaceFile);
  }

  @Transactional
  public WorkspaceFileResponse renameFile(Long fileId, Long userId, String name) {
    WorkspaceFile workspaceFile = getFileEntity(fileId);
    validateMember(workspaceFile.getWorkspaceId(), userId);

    if (!StringUtils.hasText(name)) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    workspaceFile.rename(name.trim());
    return toResponse(workspaceFile);
  }

  @Transactional
  public void deleteFile(Long fileId, Long userId) {
    WorkspaceFile workspaceFile = getFileEntity(fileId);
    validateMember(workspaceFile.getWorkspaceId(), userId);
    deleteRecursively(workspaceFile);
  }

  private void deleteRecursively(WorkspaceFile workspaceFile) {
    workspaceFile.delete();

    if (!workspaceFile.isFolder()) {
      return;
    }

    workspaceFileRepository
        .findAllByParentIdAndIsDeletedFalse(workspaceFile.getId())
        .forEach(this::deleteRecursively);
  }

  private void validateWorkspaceExists(Long workspaceId) {
    workspaceRepository
        .findByIdAndIsDeletedFalse(workspaceId)
        .orElseThrow(() -> new CustomException(ErrorCode.WORKSPACE_NOT_FOUND));
  }

  private void validateMember(Long workspaceId, Long userId) {
    if (workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, userId)) {
      return;
    }
    if (workspaceRepository.existsByIdAndOwnerIdAndIsDeletedFalse(workspaceId, userId)) {
      return;
    }
    throw new CustomException(ErrorCode.WORKSPACE_FORBIDDEN);
  }

  private void validateParentFolder(Long workspaceId, Long parentId) {
    if (parentId == null) {
      return;
    }

    WorkspaceFile parent =
        workspaceFileRepository
            .findByIdAndWorkspaceIdAndIsDeletedFalse(parentId, workspaceId)
            .orElseThrow(() -> new CustomException(ErrorCode.FILE_NOT_FOUND));

    if (!parent.isFolder()) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }
  }

  private WorkspaceFile getFileEntity(Long fileId) {
    return workspaceFileRepository
        .findByIdAndIsDeletedFalse(fileId)
        .orElseThrow(() -> new CustomException(ErrorCode.FILE_NOT_FOUND));
  }

  private WorkspaceFileResponse toResponse(WorkspaceFile file) {
    User uploader = userRepository.findById(file.getUploadedById()).orElse(null);
    UserProfile profile = userProfileRepository.findByUserId(file.getUploadedById()).orElse(null);
    return WorkspaceFileResponse.from(file, uploader, profile);
  }

  private List<WorkspaceFileResponse> toResponses(List<WorkspaceFile> files) {
    List<WorkspaceFile> sortedFiles = files.stream().sorted(fileComparator()).toList();
    if (sortedFiles.isEmpty()) {
      return List.of();
    }

    Collection<Long> uploaderIds =
        sortedFiles.stream().map(WorkspaceFile::getUploadedById).distinct().toList();
    Map<Long, User> usersById =
        userRepository.findAllById(uploaderIds).stream()
            .collect(Collectors.toMap(User::getId, Function.identity()));
    Map<Long, UserProfile> profilesByUserId =
        userProfileRepository.findAllByUserIdIn(uploaderIds).stream()
            .collect(Collectors.toMap(profile -> profile.getUser().getId(), Function.identity()));

    return sortedFiles.stream()
        .map(
            file ->
                WorkspaceFileResponse.from(
                    file,
                    usersById.get(file.getUploadedById()),
                    profilesByUserId.get(file.getUploadedById())))
        .toList();
  }

  private Comparator<WorkspaceFile> fileComparator() {
    return Comparator.comparing((WorkspaceFile file) -> file.isFolder() ? 0 : 1)
        .thenComparing(
            WorkspaceFile::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()));
  }
}
