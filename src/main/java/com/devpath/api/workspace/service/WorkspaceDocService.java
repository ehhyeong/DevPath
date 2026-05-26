package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.CreateMeetingNoteRequest;
import com.devpath.api.workspace.dto.MeetingNoteResponse;
import com.devpath.api.workspace.dto.UpdateWorkspaceDocRequest;
import com.devpath.api.workspace.dto.WorkspaceDocResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.entity.ActivityLog;
import com.devpath.domain.workspace.entity.ActivityLogType;
import com.devpath.domain.workspace.entity.MeetingNote;
import com.devpath.domain.workspace.entity.WorkspaceDoc;
import com.devpath.domain.workspace.entity.WorkspaceDocType;
import com.devpath.domain.workspace.repository.ActivityLogRepository;
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
  private final ActivityLogRepository activityLogRepository;
  private final UserRepository userRepository;
  private final TeamWorkspaceHeaderNotificationService headerNotificationService;

  @Transactional
  public WorkspaceDocResponse upsertDoc(
      Long workspaceId, Long userId, WorkspaceDocType docType, UpdateWorkspaceDocRequest request) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);

    Optional<WorkspaceDoc> existing =
        workspaceDocRepository.findByWorkspaceIdAndDocType(workspaceId, docType);

    WorkspaceDoc savedDoc;
    if (existing.isPresent()) {
      savedDoc = existing.get();
      savedDoc.update(request.getContent(), userId);
    } else {
      WorkspaceDoc doc =
          WorkspaceDoc.builder()
              .workspaceId(workspaceId)
              .docType(docType)
              .content(request.getContent())
              .updatedById(userId)
              .build();
      savedDoc = workspaceDocRepository.save(doc);
    }

    recordDocUpdated(workspaceId, userId, docType);
    return WorkspaceDocResponse.from(savedDoc);
  }

  public WorkspaceDocResponse getDoc(Long workspaceId, Long userId, WorkspaceDocType docType) {
    validateWorkspaceExists(workspaceId);
    validateMember(workspaceId, userId);

    return workspaceDocRepository
        .findByWorkspaceIdAndDocType(workspaceId, docType)
        .map(WorkspaceDocResponse::from)
        .orElse(null);
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

  @Transactional
  public MeetingNoteResponse updateMeetingNote(
      Long noteId, Long userId, CreateMeetingNoteRequest request) {
    MeetingNote note = getMeetingNoteEntity(noteId);
    validateMember(note.getWorkspaceId(), userId);

    note.update(request.getTitle(), request.getContent());
    return MeetingNoteResponse.from(note);
  }

  @Transactional
  public void deleteMeetingNote(Long noteId, Long userId) {
    MeetingNote note = getMeetingNoteEntity(noteId);
    validateMember(note.getWorkspaceId(), userId);
    note.delete();
  }

  // --- 내부 헬퍼 ---

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

  private MeetingNote getMeetingNoteEntity(Long noteId) {
    return meetingNoteRepository
        .findByIdAndIsDeletedFalse(noteId)
        .orElseThrow(() -> new CustomException(ErrorCode.DOC_NOT_FOUND));
  }

  private void recordDocUpdated(Long workspaceId, Long userId, WorkspaceDocType docType) {
    String actorName = resolveUserName(userId);
    String docLabel = docLabel(docType);
    String message = "%s님이 [%s]를 업데이트했습니다.".formatted(actorName, docLabel);

    activityLogRepository.save(
        ActivityLog.builder()
            .workspaceId(workspaceId)
            .actorId(userId)
            .activityType(ActivityLogType.DOC_UPDATED)
            .description(message)
            .build());
    headerNotificationService.addNotification(
        workspaceId, "architecture", message, "/team-ws-architecture");
  }

  private String resolveUserName(Long userId) {
    return userRepository
        .findById(userId)
        .map(User::getName)
        .filter(name -> !name.isBlank())
        .orElse("팀원");
  }

  private String docLabel(WorkspaceDocType docType) {
    return switch (docType) {
      case API_SPEC -> "API 명세서";
      case ERD -> "ERD";
      case INFRA -> "인프라 구조도";
    };
  }
}
