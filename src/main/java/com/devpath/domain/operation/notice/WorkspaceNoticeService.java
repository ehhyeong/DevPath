package com.devpath.domain.operation.notice;

import com.devpath.api.workspace.notice.dto.NoticeCreateRequest;
import com.devpath.api.workspace.notice.dto.NoticeResponse;
import com.devpath.api.workspace.notice.dto.NoticeUpdateRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceNoticeService {

  private final WorkspaceNoticeRepository noticeRepository;
  private final WorkspaceNoticeReadRepository noticeReadRepository;

  @Transactional
  public NoticeResponse createNotice(Long workspaceId, NoticeCreateRequest request) {
    WorkspaceNotice notice =
        WorkspaceNotice.builder()
            .workspaceId(workspaceId)
            .title(request.getTitle())
            .content(request.getContent())
            .build();

    WorkspaceNotice savedNotice = noticeRepository.save(notice);
    return NoticeResponse.from(savedNotice);
  }

  public List<NoticeResponse> getNoticesByWorkspace(Long workspaceId) {
    return noticeRepository
        .findByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(workspaceId)
        .stream()
        .map(NoticeResponse::from)
        .collect(Collectors.toList());
  }

  public NoticeResponse getNotice(Long noticeId) {
    WorkspaceNotice notice = findActiveNotice(noticeId);
    return NoticeResponse.from(notice);
  }

  @Transactional
  public NoticeResponse updateNotice(Long noticeId, NoticeUpdateRequest request) {
    WorkspaceNotice notice = findActiveNotice(noticeId);
    notice.updateNotice(request.getTitle(), request.getContent());
    return NoticeResponse.from(notice);
  }

  @Transactional
  public void deleteNotice(Long noticeId) {
    WorkspaceNotice notice = findActiveNotice(noticeId);
    notice.delete();
  }

  @Transactional
  public void markAsRead(Long noticeId, Long userId) {
    WorkspaceNotice notice = findActiveNotice(noticeId);

    if (noticeReadRepository.existsByNoticeIdAndUserId(notice.getId(), userId)) {
      return;
    }

    WorkspaceNoticeRead noticeRead =
        WorkspaceNoticeRead.builder()
            .workspaceId(notice.getWorkspaceId())
            .noticeId(notice.getId())
            .userId(userId)
            .build();

    try {
      noticeReadRepository.saveAndFlush(noticeRead);
    } catch (DataIntegrityViolationException ignored) {
      // Reading the same notice twice is idempotent.
    }
  }

  public List<NoticeResponse> getUnreadNotices(Long workspaceId, Long userId) {
    List<WorkspaceNotice> allNotices =
        noticeRepository.findByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(workspaceId);
    Set<Long> readNoticeIds =
        new HashSet<>(
            noticeReadRepository.findNoticeIdsByWorkspaceIdAndUserId(workspaceId, userId));

    return allNotices.stream()
        .filter(notice -> !readNoticeIds.contains(notice.getId()))
        .map(NoticeResponse::from)
        .collect(Collectors.toList());
  }

  public long getUnreadNoticeCount(Long workspaceId, Long userId) {
    long totalNotices = noticeRepository.countByWorkspaceIdAndIsDeletedFalse(workspaceId);
    long readNotices = noticeReadRepository.countActiveReadNotices(workspaceId, userId);

    return Math.max(0, totalNotices - readNotices);
  }

  private WorkspaceNotice findActiveNotice(Long noticeId) {
    return noticeRepository
        .findByIdAndIsDeletedFalse(noticeId)
        .orElseThrow(() -> new CustomException(ErrorCode.NOTICE_NOT_FOUND));
  }
}
