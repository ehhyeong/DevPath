package com.devpath.api.workspace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.devpath.api.workspace.dto.WorkspaceArchivePreviewResponse;
import com.devpath.api.workspace.preview.WorkspaceArchivePreviewer;
import com.devpath.api.workspace.preview.WorkspaceDocumentPreviewer;
import com.devpath.api.workspace.preview.WorkspaceDocxPreviewer;
import com.devpath.api.workspace.preview.WorkspaceFilePreviewer;
import com.devpath.api.workspace.preview.WorkspaceHwpxPreviewer;
import com.devpath.api.workspace.preview.WorkspaceOfficeRenderer;
import com.devpath.api.workspace.storage.WorkspaceFileStorage;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.entity.WorkspaceFile;
import com.devpath.domain.workspace.entity.WorkspaceFileType;
import com.devpath.domain.workspace.repository.WorkspaceFileRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Optional;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ByteArrayResource;

@ExtendWith(MockitoExtension.class)
class WorkspaceFileServiceTest {

  @Mock private WorkspaceFileRepository workspaceFileRepository;
  @Mock private WorkspaceRepository workspaceRepository;
  @Mock private WorkspaceMemberRepository workspaceMemberRepository;
  @Mock private UserRepository userRepository;
  @Mock private UserProfileRepository userProfileRepository;
  @Mock private WorkspaceFileStorage workspaceFileStorage;

  private WorkspaceFileService workspaceFileService;

  @BeforeEach
  void setUp() {
    workspaceFileService =
        new WorkspaceFileService(
            workspaceFileRepository,
            workspaceRepository,
            workspaceMemberRepository,
            userRepository,
            userProfileRepository,
            workspaceFileStorage,
            new WorkspaceFilePreviewer(
                new WorkspaceArchivePreviewer(workspaceFileStorage),
                new WorkspaceDocumentPreviewer(
                    workspaceFileStorage,
                    new WorkspaceOfficeRenderer(workspaceFileStorage),
                    new WorkspaceDocxPreviewer(
                        workspaceFileStorage, new WorkspaceOfficeRenderer(workspaceFileStorage)),
                    new WorkspaceHwpxPreviewer(workspaceFileStorage))));
  }

  @Test
  void getArchivePreviewReturnsNormalizedEntriesForWorkspaceMember() throws IOException {
    long fileId = 31L;
    long workspaceId = 12L;
    long userId = 7L;
    WorkspaceFile archive = archiveFile(fileId, workspaceId);
    when(workspaceFileRepository.findByIdAndIsDeletedFalse(fileId))
        .thenReturn(Optional.of(archive));
    when(workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, userId))
        .thenReturn(true);
    when(workspaceFileStorage.load(archive)).thenReturn(new ByteArrayResource(zipArchive()));

    WorkspaceArchivePreviewResponse response =
        workspaceFileService.getArchivePreview(fileId, userId);

    assertThat(response.isTruncated()).isFalse();
    assertThat(response.getEntries())
        .extracting(entry -> entry.getName())
        .containsExactly("docs/", "docs/readme.txt");
    assertThat(response.getEntries().getFirst().isDirectory()).isTrue();
    assertThat(response.getEntries().get(1).isDirectory()).isFalse();
  }

  @Test
  void getArchivePreviewRejectsUserOutsideWorkspaceBeforeReadingStorage() {
    long fileId = 31L;
    long workspaceId = 12L;
    long userId = 7L;
    when(workspaceFileRepository.findByIdAndIsDeletedFalse(fileId))
        .thenReturn(Optional.of(archiveFile(fileId, workspaceId)));
    when(workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, userId))
        .thenReturn(false);
    when(workspaceRepository.existsByIdAndOwnerIdAndIsDeletedFalse(workspaceId, userId))
        .thenReturn(false);

    assertThatThrownBy(() -> workspaceFileService.getArchivePreview(fileId, userId))
        .isInstanceOf(CustomException.class)
        .extracting(exception -> ((CustomException) exception).getErrorCode())
        .isEqualTo(ErrorCode.WORKSPACE_FORBIDDEN);
    verifyNoInteractions(workspaceFileStorage);
  }

  private WorkspaceFile archiveFile(long fileId, long workspaceId) {
    return WorkspaceFile.builder()
        .id(fileId)
        .workspaceId(workspaceId)
        .originalFileName("workspace.zip")
        .storedFileName("workspace.zip")
        .filePath("workspace.zip")
        .fileSize(128)
        .contentType("application/zip")
        .itemType(WorkspaceFileType.FILE)
        .uploadedById(7L)
        .build();
  }

  private byte[] zipArchive() throws IOException {
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    try (ZipOutputStream zip = new ZipOutputStream(output)) {
      zip.putNextEntry(new ZipEntry("docs/"));
      zip.closeEntry();
      zip.putNextEntry(new ZipEntry("docs/readme.txt"));
      zip.write("hello".getBytes());
      zip.closeEntry();
    }
    return output.toByteArray();
  }
}
