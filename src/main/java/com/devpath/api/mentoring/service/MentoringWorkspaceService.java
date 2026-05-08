package com.devpath.api.mentoring.service;

import com.devpath.api.mentoring.dto.MentoringWorkspaceResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.meeting.repository.MeetingRoomRepository;
import com.devpath.domain.mentoring.entity.Mentoring;
import com.devpath.domain.mentoring.repository.MentoringMissionRepository;
import com.devpath.domain.mentoring.repository.MentoringRepository;
import com.devpath.domain.qna.repository.MentoringQuestionRepository;
import com.devpath.domain.review.repository.PullRequestSubmissionRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MentoringWorkspaceService {

  private final MentoringRepository mentoringRepository;
  private final MentoringMissionRepository mentoringMissionRepository;
  private final PullRequestSubmissionRepository pullRequestSubmissionRepository;
  private final MentoringQuestionRepository mentoringQuestionRepository;
  private final MeetingRoomRepository meetingRoomRepository;

  public MentoringWorkspaceResponse.Workspace getWorkspace(Long mentoringId) {
    Mentoring mentoring = getActiveMentoring(mentoringId);

    // 워크스페이스는 기본 정보, 참여자, count, 최근 활동을 한 번에 반환한다.
    return MentoringWorkspaceResponse.Workspace.from(
        mentoring, buildStats(mentoring.getId()), buildRecentActivities(mentoring));
  }

  public MentoringWorkspaceResponse.Dashboard getDashboard(Long mentoringId) {
    Mentoring mentoring = getActiveMentoring(mentoringId);

    // 대시보드는 프론트 카드 UI에 맞춰 요약 중심 응답을 반환한다.
    return MentoringWorkspaceResponse.Dashboard.from(
        mentoring, buildStats(mentoring.getId()), buildRecentActivities(mentoring));
  }

  private Mentoring getActiveMentoring(Long mentoringId) {
    // Soft Delete 된 멘토링은 워크스페이스 조회 대상에서 제외한다.
    return mentoringRepository
        .findByIdAndIsDeletedFalse(mentoringId)
        .orElseThrow(() -> new CustomException(ErrorCode.MENTORING_NOT_FOUND));
  }

  private MentoringWorkspaceResponse.Stats buildStats(Long mentoringId) {
    // 삭제되지 않은 미션만 대시보드 집계에 포함한다.
    long missionCount = countMissions(mentoringId);

    // 삭제되지 않은 PR 제출만 대시보드 집계에 포함한다.
    long pullRequestCount = countPullRequests(mentoringId);

    // 삭제되지 않은 멘토링 질문만 대시보드 집계에 포함한다.
    long questionCount = countQuestions(mentoringId);

    // 삭제되지 않은 회의방만 대시보드 집계에 포함한다.
    long meetingCount = countMeetings(mentoringId);

    return MentoringWorkspaceResponse.Stats.of(
        missionCount, pullRequestCount, questionCount, meetingCount);
  }

  private List<MentoringWorkspaceResponse.RecentActivity> buildRecentActivities(
      Mentoring mentoring) {
    // 아직 활동 도메인이 없으므로 멘토링 시작 이벤트를 기본 최근 활동으로 제공한다.
    return List.of(
        MentoringWorkspaceResponse.RecentActivity.of(
            "MENTORING_STARTED", "멘토링이 시작되었습니다.", mentoring.getStartedAt()));
  }

  private long countMissions(Long mentoringId) {
    return mentoringMissionRepository.countByMentoring_IdAndIsDeletedFalse(mentoringId);
  }

  private long countPullRequests(Long mentoringId) {
    return pullRequestSubmissionRepository
        .countByMissionSubmission_Mission_Mentoring_IdAndIsDeletedFalse(mentoringId);
  }

  private long countQuestions(Long mentoringId) {
    return mentoringQuestionRepository.countByMentoring_IdAndIsDeletedFalse(mentoringId);
  }

  private long countMeetings(Long mentoringId) {
    return meetingRoomRepository.countByMentoring_IdAndIsDeletedFalse(mentoringId);
  }
}
