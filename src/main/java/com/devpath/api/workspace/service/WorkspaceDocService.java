package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.CreateMeetingNoteRequest;
import com.devpath.api.workspace.dto.MeetingNoteResponse;
import com.devpath.api.workspace.dto.UpdateWorkspaceDocRequest;
import com.devpath.api.workspace.dto.WorkspaceDocResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.workspace.entity.MeetingNote;
import com.devpath.domain.workspace.entity.WorkspaceDoc;
import com.devpath.domain.workspace.entity.WorkspaceDocType;
import com.devpath.domain.workspace.repository.MeetingNoteRepository;
import com.devpath.domain.workspace.repository.WorkspaceDocRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceDocService {

  private final WorkspaceDocRepository workspaceDocRepository;
  private final MeetingNoteRepository meetingNoteRepository;
  private final WorkspaceRepository workspaceRepository;
  private final WorkspaceMemberRepository workspaceMemberRepository;

  @Transactional
  public WorkspaceDocResponse upsertDoc(
      Long workspaceId, Long userId, WorkspaceDocType docType, UpdateWorkspaceDocRequest request) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);

    Optional<WorkspaceDoc> existing =
        workspaceDocRepository.findByWorkspaceIdAndDocType(workspaceId, docType);

    if (existing.isPresent()) {
      existing.get().update(request.getContent(), userId);
      return WorkspaceDocResponse.from(existing.get());
    }

    WorkspaceDoc doc =
        WorkspaceDoc.builder()
            .workspaceId(workspaceId)
            .docType(docType)
            .content(request.getContent())
            .updatedById(userId)
            .build();
    return WorkspaceDocResponse.from(workspaceDocRepository.save(doc));
  }

  public WorkspaceDocResponse getDoc(Long workspaceId, Long userId, WorkspaceDocType docType) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);

    return workspaceDocRepository
        .findByWorkspaceIdAndDocType(workspaceId, docType)
        .map(WorkspaceDocResponse::from)
        .orElseThrow(() -> new CustomException(ErrorCode.DOC_NOT_FOUND));
  }

  @Transactional
  public MeetingNoteResponse createMeetingNote(
      Long workspaceId, Long userId, CreateMeetingNoteRequest request) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);

    MeetingNote note =
        MeetingNote.builder()
            .workspaceId(workspaceId)
            .title(request.getTitle())
            .content(request.getContent())
            .createdById(userId)
            .build();
    return MeetingNoteResponse.from(meetingNoteRepository.save(note));
  }

  public List<MeetingNoteResponse> getMeetingNotes(Long workspaceId, Long userId) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);

    return meetingNoteRepository
        .findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(workspaceId)
        .stream()
        .map(MeetingNoteResponse::from)
        .toList();
  }

  // --- 내부 헬퍼 ---

  private void validateWorkspaceExists(Long workspaceId) {
    workspaceRepository
        .findByIdAndIsDeletedFalse(workspaceId)
        .orElseThrow(() -> new CustomException(ErrorCode.WORKSPACE_NOT_FOUND));
  }

  private void validateMember(Long workspaceId, Long userId) {
    if (!workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, userId)) {
      throw new CustomException(ErrorCode.WORKSPACE_FORBIDDEN);
    }
  }
}
