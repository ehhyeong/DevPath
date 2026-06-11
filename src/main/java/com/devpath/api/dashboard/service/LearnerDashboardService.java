package com.devpath.api.dashboard.service;

import com.devpath.api.dashboard.dto.DashboardGrowthRecommendationResponse;
import com.devpath.api.dashboard.dto.DashboardGrowthRecommendationResponse.RecommendationItem;
import com.devpath.api.dashboard.dto.DashboardMentoringResponse;
import com.devpath.api.dashboard.dto.DashboardStudyGroupResponse;
import com.devpath.api.dashboard.dto.DashboardSummaryResponse;
import com.devpath.api.dashboard.dto.HeatmapResponse;
import com.devpath.api.roadmap.service.CustomRoadmapPrerequisiteSyncService;
import com.devpath.api.roadmap.service.RoadmapProgressService;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
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
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.study.entity.StudyGroup;
import com.devpath.domain.study.entity.StudyGroupJoinStatus;
import com.devpath.domain.study.entity.StudyGroupMember;
import com.devpath.domain.study.entity.StudyGroupStatus;
import com.devpath.domain.study.repository.StudyGroupMemberRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LearnerDashboardService {

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
  private final UserTechStackRepository userTechStackRepository;
  private final RoadmapNodeRepository roadmapNodeRepository;
  private final NodeRequiredTagRepository nodeRequiredTagRepository;
  private final CustomRoadmapRepository customRoadmapRepository;
  private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
  private final CustomRoadmapPrerequisiteSyncService prerequisiteSyncService;
  private final RoadmapProgressService roadmapProgressService;

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
              .studyHours(dailyStudyHours)
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
    Set<String> learnerTags = resolveLearnerTagSet(learnerId, proofCards);

    if (learnerTags.isEmpty()) {
      return buildEmptyRecommendation();
    }

    List<RoadmapNode> officialNodes = roadmapNodeRepository.findAllOfficialPublicNodes();
    if (officialNodes.isEmpty()) {
      return buildEmptyRecommendation();
    }

    Map<Long, List<String>> requiredTagsByNodeId = loadRequiredTagsByNodeId(officialNodes);
    Set<Long> existingNodeIds =
        new LinkedHashSet<>(customRoadmapNodeRepository.findOriginalNodeIdsByUserId(learnerId));
    Set<Long> clearedNodeIds =
        nodeClearanceRepository
            .findAllByUserIdAndClearanceStatusOrderByClearedAtDesc(
                learnerId, ClearanceStatus.CLEARED)
            .stream()
            .map(clearance -> clearance.getNode().getNodeId())
            .collect(Collectors.toCollection(LinkedHashSet::new));

    List<DashboardNodeRecommendationCandidate> candidates =
        officialNodes.stream()
            .filter(node -> !existingNodeIds.contains(node.getNodeId()))
            .filter(node -> !clearedNodeIds.contains(node.getNodeId()))
            .map(node -> toDashboardCandidate(node, requiredTagsByNodeId, learnerTags))
            .sorted(dashboardRecommendationComparator())
            .limit(2)
            .toList();

    if (candidates.isEmpty()) {
      return buildEmptyRecommendation();
    }

    List<RecommendationItem> items = candidates.stream().map(this::toRecommendationItem).toList();
    return DashboardGrowthRecommendationResponse.builder()
        .analysisText(buildGrowthAnalysisText(learnerTags.size(), items.size()))
        .recommendations(items)
        .build();
  }

  @Transactional
  public DashboardGrowthRecommendationResponse.AddNodeResponse addGrowthRecommendationNode(
      Long learnerId, Long nodeId) {
    User user =
        userRepository
            .findById(learnerId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    RoadmapNode node =
        roadmapNodeRepository
            .findById(nodeId)
            .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NODE_NOT_FOUND));

    List<CustomRoadmap> roadmaps =
        customRoadmapRepository.findAllByUserOrderByUpdatedAtDescCreatedAtDesc(user);
    boolean roadmapCreated = roadmaps.isEmpty();
    CustomRoadmap customRoadmap =
        roadmapCreated
            ? customRoadmapRepository.save(
                CustomRoadmap.builderOriginBuilder().user(user).title(node.getTitle()).build())
            : roadmaps.get(0);

    CustomRoadmapNode customNode =
        customRoadmapNodeRepository
            .findByCustomRoadmapAndOriginalNode(customRoadmap, node)
            .orElse(null);
    boolean alreadyExists = customNode != null;

    if (customNode == null) {
      customNode =
          CustomRoadmapNode.builder()
              .customRoadmap(customRoadmap)
              .originalNode(node)
              .customSortOrder(resolveNextCustomSortOrder(customRoadmap, node))
              .build();

      if (areRequiredTagsSatisfied(
          nodeRequiredTagRepository.findTagNamesByNodeId(nodeId),
          resolveLearnerTagSet(
              learnerId, proofCardRepository.findAllByUserIdOrderByIssuedAtDesc(learnerId)))) {
        customNode.complete();
      }

      customNode = customRoadmapNodeRepository.save(customNode);
      prerequisiteSyncService.ensurePrerequisites(customRoadmap);
      roadmapProgressService.updateProgressRate(
          customRoadmap, customRoadmapNodeRepository.findAllByCustomRoadmap(customRoadmap));
    }

    return DashboardGrowthRecommendationResponse.AddNodeResponse.builder()
        .customRoadmapId(customRoadmap.getId())
        .customNodeId(customNode.getId())
        .nodeId(node.getNodeId())
        .nodeTitle(node.getTitle())
        .roadmapCreated(roadmapCreated)
        .alreadyExists(alreadyExists)
        .build();
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

  private Set<String> resolveLearnerTagSet(Long learnerId, List<ProofCard> proofCards) {
    Set<String> tags = new LinkedHashSet<>();

    if (!proofCards.isEmpty()) {
      List<Long> proofCardIds = proofCards.stream().map(ProofCard::getId).toList();
      proofCardTagRepository
          .findAllByProofCardIdInOrderByProofCardIdAscIdAsc(proofCardIds)
          .forEach(proofCardTag -> tags.add(proofCardTag.getTag().getName()));
    }

    tags.addAll(userTechStackRepository.findTagNamesByUserId(learnerId));
    return normalizeTagSet(tags);
  }

  private Map<Long, List<String>> loadRequiredTagsByNodeId(List<RoadmapNode> nodes) {
    List<Long> nodeIds = nodes.stream().map(RoadmapNode::getNodeId).toList();
    Map<Long, List<String>> result = new LinkedHashMap<>();
    nodeIds.forEach(nodeId -> result.put(nodeId, List.of()));

    Map<Long, List<String>> grouped =
        nodeRequiredTagRepository.findTagNamesByNodeIds(nodeIds).stream()
            .collect(
                Collectors.groupingBy(
                    NodeRequiredTagRepository.NodeRequiredTagNameProjection::getNodeId,
                    LinkedHashMap::new,
                    Collectors.mapping(
                        NodeRequiredTagRepository.NodeRequiredTagNameProjection::getTagName,
                        Collectors.toList())));

    result.putAll(grouped);
    return result;
  }

  private DashboardNodeRecommendationCandidate toDashboardCandidate(
      RoadmapNode node, Map<Long, List<String>> requiredTagsByNodeId, Set<String> learnerTags) {
    List<String> requiredTags = requiredTagsByNodeId.getOrDefault(node.getNodeId(), List.of());
    Set<String> normalizedRequiredTags = normalizeTagSet(requiredTags);
    int matchedTagCount =
        (int) normalizedRequiredTags.stream().filter(learnerTags::contains).count();
    int requiredTagCount = normalizedRequiredTags.size();
    int missingTagCount = Math.max(requiredTagCount - matchedTagCount, 0);
    double coveragePercent =
        requiredTagCount == 0 ? 50.0 : (matchedTagCount * 100.0) / requiredTagCount;
    int sortOrder = node.getSortOrder() != null ? node.getSortOrder() : 1000;
    double score =
        (matchedTagCount > 0 ? 60.0 : 0.0)
            + (coveragePercent * 0.4)
            + (Math.min(requiredTagCount, 5) * 4.0)
            - (missingTagCount * 6.0)
            - (sortOrder * 0.01);
    int growthPercent =
        Math.max(
            8,
            Math.min(
                35,
                (int)
                    Math.round(
                        8
                            + (missingTagCount * 4.0)
                            + (matchedTagCount * 3.0)
                            + (coveragePercent / 20.0))));

    return new DashboardNodeRecommendationCandidate(
        node,
        requiredTags,
        matchedTagCount,
        missingTagCount,
        coveragePercent,
        score,
        growthPercent,
        buildNodeReason(requiredTags, matchedTagCount));
  }

  private Comparator<DashboardNodeRecommendationCandidate> dashboardRecommendationComparator() {
    return Comparator.comparingDouble(DashboardNodeRecommendationCandidate::score)
        .reversed()
        .thenComparing(candidate -> candidate.node().getRoadmap().getRoadmapId())
        .thenComparing(
            candidate -> candidate.node().getSortOrder(), Comparator.nullsLast(Integer::compareTo))
        .thenComparing(candidate -> candidate.node().getNodeId());
  }

  private RecommendationItem toRecommendationItem(DashboardNodeRecommendationCandidate candidate) {
    RoadmapNode node = candidate.node();
    return RecommendationItem.builder()
        .nodeId(node.getNodeId())
        .roadmapId(node.getRoadmap().getRoadmapId())
        .nodeTitle(node.getTitle())
        .roadmapTitle(node.getRoadmap().getTitle())
        .reason(candidate.reason())
        .matchRateIncrease(candidate.growthPercent())
        .iconClass(resolveGrowthIconClass(node, candidate.requiredTags()))
        .build();
  }

  private String buildGrowthAnalysisText(int tagCount, int recommendationCount) {
    return "Proof Card와 기술 태그 "
        + tagCount
        + "개를 기준으로 추가 학습하기 좋은 로드맵 노드 "
        + recommendationCount
        + "개를 추천했습니다.";
  }

  private String buildNodeReason(List<String> requiredTags, int matchedTagCount) {
    if (requiredTags.isEmpty()) {
      return "공식 로드맵의 기초 노드라 바로 추가해서 학습을 시작할 수 있습니다.";
    }
    if (matchedTagCount == 0) {
      return "현재 보유 태그와 직접 겹치지는 않지만 다음 성장 단계로 확장하기 좋은 노드입니다.";
    }
    return "보유 태그 " + matchedTagCount + "개가 연결되어 지금 이어서 학습하기 좋은 노드입니다.";
  }

  private String resolveGrowthIconClass(RoadmapNode node, List<String> requiredTags) {
    String text = (node.getTitle() + " " + String.join(" ", requiredTags)).toLowerCase(Locale.ROOT);
    if (text.contains("sql") || text.contains("database") || text.contains("db")) {
      return "fa-database";
    }
    if (text.contains("security") || text.contains("auth")) {
      return "fa-shield-alt";
    }
    if (text.contains("spring") || text.contains("server") || text.contains("api")) {
      return "fa-server";
    }
    if (text.contains("react")
        || text.contains("next")
        || text.contains("javascript")
        || text.contains("frontend")) {
      return "fa-code";
    }
    if (text.contains("ai") || text.contains("data")) {
      return "fa-brain";
    }
    return "fa-route";
  }

  private int resolveNextCustomSortOrder(CustomRoadmap customRoadmap, RoadmapNode node) {
    return customRoadmapNodeRepository.findAllByCustomRoadmap(customRoadmap).stream()
        .map(CustomRoadmapNode::getCustomSortOrder)
        .filter(Objects::nonNull)
        .max(Integer::compareTo)
        .map(value -> value + 10)
        .orElseGet(() -> node.getSortOrder() != null ? node.getSortOrder() : 10);
  }

  private boolean areRequiredTagsSatisfied(List<String> requiredTags, Set<String> learnerTags) {
    Set<String> normalizedRequiredTags = normalizeTagSet(requiredTags);
    return !normalizedRequiredTags.isEmpty() && learnerTags.containsAll(normalizedRequiredTags);
  }

  private Set<String> normalizeTagSet(Collection<String> tags) {
    if (tags == null || tags.isEmpty()) {
      return Set.of();
    }

    return tags.stream()
        .filter(tag -> tag != null && !tag.isBlank())
        .map(tag -> tag.trim().toLowerCase(Locale.ROOT))
        .collect(Collectors.toCollection(LinkedHashSet::new));
  }

  private record DashboardNodeRecommendationCandidate(
      RoadmapNode node,
      List<String> requiredTags,
      int matchedTagCount,
      int missingTagCount,
      double coveragePercent,
      double score,
      int growthPercent,
      String reason) {}

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
