package com.devpath.api.dashboard.service;

import com.devpath.api.dashboard.dto.DashboardGrowthRecommendationResponse;
import com.devpath.api.dashboard.dto.DashboardGrowthRecommendationResponse.RecommendationItem;
import com.devpath.api.dashboard.dto.DashboardMentoringResponse;
import com.devpath.api.dashboard.dto.DashboardStudyGroupResponse;
import com.devpath.api.dashboard.dto.DashboardSummaryResponse;
import com.devpath.api.dashboard.dto.HeatmapResponse;
import com.devpath.common.provider.GeminiProvider;
import com.devpath.domain.dashboard.entity.DashboardSnapshot;
import com.devpath.domain.dashboard.repository.DashboardSnapshotRepository;
import com.devpath.domain.learning.entity.LessonProgress;
import com.devpath.domain.learning.entity.clearance.ClearanceStatus;
import com.devpath.domain.learning.entity.proof.ProofCard;
import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.learning.repository.clearance.NodeClearanceRepository;
import com.devpath.domain.learning.repository.proof.ProofCardRepository;
import com.devpath.domain.learning.repository.proof.ProofCardTagRepository;
import com.devpath.domain.planner.entity.Streak;
import com.devpath.domain.planner.repository.StreakRepository;
import com.devpath.domain.project.entity.MentoringApplication;
import com.devpath.domain.project.entity.MentoringApplicationStatus;
import com.devpath.domain.project.entity.Project;
import com.devpath.domain.project.entity.ProjectMember;
import com.devpath.domain.project.repository.MentoringApplicationRepository;
import com.devpath.domain.project.repository.ProjectMemberRepository;
import com.devpath.domain.project.repository.ProjectRepository;
import com.devpath.domain.study.entity.StudyGroup;
import com.devpath.domain.study.entity.StudyGroupJoinStatus;
import com.devpath.domain.study.entity.StudyGroupMember;
import com.devpath.domain.study.entity.StudyGroupStatus;
import com.devpath.domain.study.repository.StudyGroupMemberRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LearnerDashboardService {

  private static final ObjectMapper MAPPER = new ObjectMapper();

  private final StreakRepository streakRepository;
  private final LessonProgressRepository lessonProgressRepository;
  private final NodeClearanceRepository nodeClearanceRepository;
  private final DashboardSnapshotRepository dashboardSnapshotRepository;
  private final StudyGroupMemberRepository studyGroupMemberRepository;
  private final ProofCardRepository proofCardRepository;
  private final ProofCardTagRepository proofCardTagRepository;
  private final ProjectMemberRepository projectMemberRepository;
  private final ProjectRepository projectRepository;
  private final MentoringApplicationRepository mentoringApplicationRepository;
  private final UserRepository userRepository;
  private final GeminiProvider geminiProvider;

  public DashboardSummaryResponse getSummary(Long learnerId) {
    int currentStreak =
        streakRepository.findByLearnerId(learnerId).map(Streak::getCurrentStreak).orElse(0);

    int totalStudyHours = calculateTotalStudyHours(learnerId);
    int completedNodes = calculateCompletedNodes(learnerId);
    Integer studyHoursDeltaMinutes = calculateStudyDeltaMinutes(learnerId);
    String lastLessonInfo = resolveLastLessonInfo(learnerId);

    return DashboardSummaryResponse.builder()
        .totalStudyHours(totalStudyHours)
        .completedNodes(completedNodes)
        .currentStreak(currentStreak)
        .studyHoursDeltaMinutes(studyHoursDeltaMinutes)
        .lastLessonInfo(lastLessonInfo)
        .build();
  }

  public List<HeatmapResponse> getHeatmap(Long learnerId) {
    List<DashboardSnapshot> snapshots =
        dashboardSnapshotRepository.findAllByLearnerIdOrderBySnapshotDateAsc(learnerId);
    List<HeatmapResponse> responses = new ArrayList<>();

    int previousTotalStudyHours = 0;

    for (DashboardSnapshot snapshot : snapshots) {
      int dailyStudyHours = Math.max(snapshot.getTotalStudyHours() - previousTotalStudyHours, 0);

      responses.add(
          HeatmapResponse.builder()
              .date(snapshot.getSnapshotDate())
              .activityLevel(toActivityLevel(dailyStudyHours))
              .build());

      previousTotalStudyHours = snapshot.getTotalStudyHours();
    }

    return responses;
  }

  public DashboardStudyGroupResponse getDashboardStudyGroup(Long learnerId) {
    List<StudyGroupMember> memberships =
        studyGroupMemberRepository.findAllByLearnerIdAndJoinStatusOrderByJoinedAtDesc(
            learnerId, StudyGroupJoinStatus.APPROVED);

    List<StudyGroupMember> activeMemberships =
        memberships.stream()
            .filter(member -> member.getStudyGroup() != null)
            .filter(member -> !Boolean.TRUE.equals(member.getStudyGroup().getIsDeleted()))
            .toList();

    int recruitingGroupCount =
        (int)
            activeMemberships.stream()
                .map(StudyGroupMember::getStudyGroup)
                .filter(group -> group.getStatus() == StudyGroupStatus.RECRUITING)
                .count();

    int inProgressGroupCount =
        (int)
            activeMemberships.stream()
                .map(StudyGroupMember::getStudyGroup)
                .filter(group -> group.getStatus() == StudyGroupStatus.IN_PROGRESS)
                .count();

    List<DashboardStudyGroupResponse.StudyGroupItem> groups =
        activeMemberships.stream()
            .map(
                member -> {
                  StudyGroup group = member.getStudyGroup();
                  List<StudyGroupMember> approvedMembers =
                      studyGroupMemberRepository.findAllByStudyGroupIdAndJoinStatus(
                          group.getId(), StudyGroupJoinStatus.APPROVED);
                  int memberCount = approvedMembers.size();
                  List<Long> memberIds =
                      approvedMembers.stream()
                          .map(StudyGroupMember::getLearnerId)
                          .limit(4)
                          .toList();
                  return DashboardStudyGroupResponse.StudyGroupItem.builder()
                      .groupId(group.getId())
                      .name(group.getName())
                      .status(group.getStatus())
                      .maxMembers(group.getMaxMembers())
                      .joinedAt(member.getJoinedAt())
                      .plannedEndDate(group.getPlannedEndDate())
                      .currentMemberCount(memberCount)
                      .memberIds(memberIds)
                      .build();
                })
            .toList();

    return DashboardStudyGroupResponse.builder()
        .joinedGroupCount(activeMemberships.size())
        .recruitingGroupCount(recruitingGroupCount)
        .inProgressGroupCount(inProgressGroupCount)
        .groups(groups)
        .build();
  }

  public DashboardMentoringResponse getDashboardMentoring(Long learnerId) {
    List<ProjectMember> memberships =
        projectMemberRepository.findAllByLearnerIdOrderByJoinedAtDesc(learnerId);
    if (memberships.isEmpty()) {
      return buildEmptyMentoringResponse();
    }

    List<Long> projectIds =
        memberships.stream().map(ProjectMember::getProjectId).distinct().toList();

    Map<Long, Project> projectsById =
        projectRepository.findAllById(projectIds).stream()
            .filter(project -> !Boolean.TRUE.equals(project.getIsDeleted()))
            .collect(Collectors.toMap(Project::getId, project -> project));

    List<ProjectMember> activeMemberships =
        memberships.stream()
            .filter(member -> projectsById.containsKey(member.getProjectId()))
            .toList();

    if (activeMemberships.isEmpty()) {
      return buildEmptyMentoringResponse();
    }

    List<Long> activeProjectIds =
        activeMemberships.stream().map(ProjectMember::getProjectId).distinct().toList();

    List<MentoringApplication> applications =
        mentoringApplicationRepository.findAllByProjectIdInOrderByCreatedAtDesc(activeProjectIds);

    Map<Long, User> mentorsById =
        userRepository
            .findAllById(
                applications.stream().map(MentoringApplication::getMentorId).distinct().toList())
            .stream()
            .collect(Collectors.toMap(User::getId, user -> user));

    ProjectMember latestMembership = activeMemberships.get(0);
    Project latestProject = projectsById.get(latestMembership.getProjectId());
    MentoringApplication latestApplication = applications.isEmpty() ? null : applications.get(0);

    int pendingApplicationCount =
        (int)
            applications.stream()
                .filter(
                    application ->
                        application.getStatus() == MentoringApplicationStatus.PENDING
                            || application.getStatus() == MentoringApplicationStatus.UNDER_REVIEW)
                .count();

    DashboardMentoringResponse.ProjectItem latestProjectItem =
        latestProject == null
            ? null
            : DashboardMentoringResponse.ProjectItem.builder()
                .projectId(latestProject.getId())
                .name(latestProject.getName())
                .status(latestProject.getStatus())
                .joinedAt(latestMembership.getJoinedAt())
                .build();

    DashboardMentoringResponse.ApplicationItem latestApplicationItem =
        latestApplication == null
            ? null
            : DashboardMentoringResponse.ApplicationItem.builder()
                .applicationId(latestApplication.getId())
                .mentorId(latestApplication.getMentorId())
                .mentorName(
                    mentorsById.get(latestApplication.getMentorId()) != null
                        ? mentorsById.get(latestApplication.getMentorId()).getName()
                        : null)
                .status(latestApplication.getStatus())
                .message(latestApplication.getMessage())
                .createdAt(latestApplication.getCreatedAt())
                .build();

    return DashboardMentoringResponse.builder()
        .joinedProjectCount(activeProjectIds.size())
        .applicationCount(applications.size())
        .pendingApplicationCount(pendingApplicationCount)
        .latestProject(latestProjectItem)
        .latestApplication(latestApplicationItem)
        .build();
  }

  public DashboardGrowthRecommendationResponse getGrowthRecommendation(Long learnerId) {
    List<ProofCard> proofCards = proofCardRepository.findAllByUserIdOrderByIssuedAtDesc(learnerId);

    if (proofCards.isEmpty()) {
      return buildEmptyRecommendation();
    }

    List<Long> proofCardIds = proofCards.stream().map(ProofCard::getId).toList();
    List<String> tagNames =
        proofCardTagRepository
            .findAllByProofCardIdInOrderByProofCardIdAscIdAsc(proofCardIds)
            .stream()
            .map(pct -> pct.getTag().getName())
            .distinct()
            .collect(Collectors.toList());

    if (tagNames.isEmpty()) {
      return buildEmptyRecommendation();
    }

    String tagList = String.join(", ", tagNames);
    String prompt =
        String.format(
            "학습자가 다음 기술 태그를 보유하고 있습니다: [%s]\n"
                + "다음 단계 학습에 적합한 강의 2개를 추천하고, 현재 역량 분석 한 줄을 작성하세요.\n"
                + "반드시 아래 JSON 형식으로만 응답하세요:\n"
                + "{\n"
                + "  \"analysisText\": \"분석 텍스트(1~2문장)\",\n"
                + "  \"recommendations\": [\n"
                + "    {\"courseTitle\": \"...\", \"matchRateIncrease\": 20, \"iconClass\": \"fa-database\"},\n"
                + "    {\"courseTitle\": \"...\", \"matchRateIncrease\": 15, \"iconClass\": \"fa-server\"}\n"
                + "  ]\n"
                + "}",
            tagList);

    try {
      String response = geminiProvider.generate(prompt);
      if (response != null) {
        int start = response.indexOf('{');
        int end = response.lastIndexOf('}');
        if (start >= 0 && end > start) {
          JsonNode json = MAPPER.readTree(response.substring(start, end + 1));
          String analysisText = json.path("analysisText").asText(null);
          JsonNode recs = json.path("recommendations");
          if (analysisText != null && recs.isArray() && recs.size() > 0) {
            List<RecommendationItem> items = new ArrayList<>();
            for (JsonNode rec : recs) {
              items.add(
                  RecommendationItem.builder()
                      .courseTitle(rec.path("courseTitle").asText("추천 강의"))
                      .matchRateIncrease(rec.path("matchRateIncrease").asInt(10))
                      .iconClass(rec.path("iconClass").asText("fa-book"))
                      .build());
            }
            return DashboardGrowthRecommendationResponse.builder()
                .analysisText(analysisText)
                .recommendations(items)
                .build();
          }
        }
      }
    } catch (Exception e) {
      log.warn("[LearnerDashboardService] Gemini 성장 제안 파싱 실패: {}", e.getMessage());
    }

    return buildEmptyRecommendation();
  }

  private DashboardMentoringResponse buildEmptyMentoringResponse() {
    return DashboardMentoringResponse.builder()
        .joinedProjectCount(0)
        .applicationCount(0)
        .pendingApplicationCount(0)
        .latestProject(null)
        .latestApplication(null)
        .build();
  }

  private DashboardGrowthRecommendationResponse buildEmptyRecommendation() {
    return DashboardGrowthRecommendationResponse.builder()
        .analysisText("현재 학습 데이터가 충분하지 않아 추천을 생성하지 못했습니다.")
        .recommendations(List.of())
        .build();
  }

  private int calculateTotalStudyHours(Long learnerId) {
    long totalProgressSeconds = lessonProgressRepository.sumProgressSecondsByLearnerId(learnerId);
    int totalStudyHours = (int) (totalProgressSeconds / 3600L);

    if (totalStudyHours > 0) {
      return totalStudyHours;
    }

    return dashboardSnapshotRepository
        .findTopByLearnerIdOrderBySnapshotDateDesc(learnerId)
        .map(DashboardSnapshot::getTotalStudyHours)
        .orElse(0);
  }

  private int calculateCompletedNodes(Long learnerId) {
    int completedNodes =
        (int)
            nodeClearanceRepository.countByUserIdAndClearanceStatus(
                learnerId, ClearanceStatus.CLEARED);

    if (completedNodes > 0) {
      return completedNodes;
    }

    return dashboardSnapshotRepository
        .findTopByLearnerIdOrderBySnapshotDateDesc(learnerId)
        .map(DashboardSnapshot::getCompletedNodes)
        .orElse(0);
  }

  private Integer calculateStudyDeltaMinutes(Long learnerId) {
    long todayTotalSeconds = lessonProgressRepository.sumProgressSecondsByLearnerId(learnerId);
    int todayTotalMinutes = (int) (todayTotalSeconds / 60);

    int yesterdayTotalMinutes =
        dashboardSnapshotRepository
            .findByLearnerIdAndSnapshotDate(learnerId, LocalDate.now().minusDays(1))
            .map(snapshot -> snapshot.getTotalStudyHours() * 60)
            .orElse(0);

    int delta = todayTotalMinutes - yesterdayTotalMinutes;
    return delta > 0 ? delta : null;
  }

  private String resolveLastLessonInfo(Long learnerId) {
    List<LessonProgress> recent =
        lessonProgressRepository.findRecentByUserIdWithLessonAndSection(
            learnerId, PageRequest.of(0, 1));
    if (recent.isEmpty()) {
      return null;
    }
    LessonProgress lessonProgress = recent.get(0);
    String sectionTitle = lessonProgress.getLesson().getSection().getTitle();
    int lessonOrder =
        lessonProgress.getLesson().getOrderIndex() != null
            ? lessonProgress.getLesson().getOrderIndex()
            : 0;
    String lessonTitle = lessonProgress.getLesson().getTitle();
    return sectionTitle + " - " + lessonOrder + "강. " + lessonTitle;
  }

  private int toActivityLevel(int dailyStudyHours) {
    if (dailyStudyHours <= 0) {
      return 0;
    }
    if (dailyStudyHours == 1) {
      return 1;
    }
    if (dailyStudyHours <= 3) {
      return 2;
    }
    if (dailyStudyHours <= 5) {
      return 3;
    }
    return 4;
  }
}
