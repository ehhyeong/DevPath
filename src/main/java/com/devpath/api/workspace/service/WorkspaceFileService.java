package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceFileResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.workspace.entity.WorkspaceFile;
import com.devpath.domain.workspace.repository.WorkspaceFileRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceFileService {

    private final WorkspaceFileRepository workspaceFileRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    @Value("${app.upload.dir:./uploads}")
    private String uploadBaseDir;

    @Transactional
    public WorkspaceFileResponse uploadFile(Long workspaceId, Long userId, MultipartFile file) {
        validateWorkspaceExists(workspaceId);
        validateMember(workspaceId, userId);

        String storedFileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path dirPath = Paths.get(uploadBaseDir, "workspace", String.valueOf(workspaceId));
        Path filePath = dirPath.resolve(storedFileName);

        try {
            Files.createDirectories(dirPath);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new CustomException(ErrorCode.FILE_UPLOAD_FAILED);
        }

        WorkspaceFile workspaceFile = WorkspaceFile.builder()
                .workspaceId(workspaceId)
                .originalFileName(file.getOriginalFilename())
                .storedFileName(storedFileName)
                .filePath(filePath.toString())
                .fileSize(file.getSize())
                .contentType(file.getContentType())
                .uploadedById(userId)
                .build();

        return WorkspaceFileResponse.from(workspaceFileRepository.save(workspaceFile));
    }

    public List<WorkspaceFileResponse> getFiles(Long workspaceId, Long userId) {
        validateWorkspaceExists(workspaceId);
        validateMember(workspaceId, userId);

        return workspaceFileRepository
                .findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(workspaceId)
                .stream()
                .map(WorkspaceFileResponse::from)
                .toList();
    }

    public Resource downloadFile(Long fileId, Long userId) {
        WorkspaceFile workspaceFile = getFileEntity(fileId);
        validateMember(workspaceFile.getWorkspaceId(), userId);

        try {
            Path path = Paths.get(workspaceFile.getFilePath());
            Resource resource = new UrlResource(path.toUri());
            if (!resource.exists()) {
                throw new CustomException(ErrorCode.FILE_NOT_FOUND);
            }
            return resource;
        } catch (IOException e) {
            throw new CustomException(ErrorCode.FILE_NOT_FOUND);
        }
    }

    public String getOriginalFileName(Long fileId) {
        return getFileEntity(fileId).getOriginalFileName();
    }

    @Transactional
    public void deleteFile(Long fileId, Long userId) {
        WorkspaceFile workspaceFile = getFileEntity(fileId);
        validateMember(workspaceFile.getWorkspaceId(), userId);
        workspaceFile.delete();
    }

    // --- 내부 헬퍼 ---

    private void validateWorkspaceExists(Long workspaceId) {
        workspaceRepository.findByIdAndIsDeletedFalse(workspaceId)
                .orElseThrow(() -> new CustomException(ErrorCode.WORKSPACE_NOT_FOUND));
    }

    private void validateMember(Long workspaceId, Long userId) {
        if (!workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, userId)) {
            throw new CustomException(ErrorCode.WORKSPACE_FORBIDDEN);
        }
    }

    private WorkspaceFile getFileEntity(Long fileId) {
        return workspaceFileRepository.findByIdAndIsDeletedFalse(fileId)
                .orElseThrow(() -> new CustomException(ErrorCode.FILE_NOT_FOUND));
    }
}