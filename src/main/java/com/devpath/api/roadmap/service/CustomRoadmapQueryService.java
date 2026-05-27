package com.devpath.api.roadmap.service;

import com.devpath.api.learning.service.CourseCompletionTagService;
import com.devpath.api.roadmap.dto.MyRoadmapDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.builder.repository.MyRoadmapRepository;
import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseTagMapRepository;
import com.devpath.domain.learning.entity.clearance.NodeClearance;
import com.devpath.domain.learning.repository.clearance.NodeClearanceRepository;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.NodeStatus;
import com.devpath.domain.roadmap.entity.RoadmapNodeResource;
import com.devpath.domain.roadmap.repository.CustomNodePrerequisiteRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeResourceRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CustomRoadmapQueryService {

  private final UserRepository userRepository;
  private final CustomRoadmapRepository customRoadmapRepository;
  private final MyRoadmapRepository myRoadmapRepository;
  private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
  private final CustomNodePrerequisiteRepository customNodePrerequisiteRepository;
  private final NodeClearanceRepository nodeClearanceRepository;
  private final RoadmapNodeResourceRepository roadmapNodeResourceRepository;
  private final NodeRequiredTagRepository nodeRequiredTagRepository;
  private final RoadmapProgressService roadmapProgressService;
  private final CustomRoadmapPrerequisiteSyncService prerequisiteSyncService;
  private final CourseCompletionTagService courseCompletionTagService;
  private final UserTechStackRepository userTechStackRepository;
  // [TEMP] 추천 무료 강좌 조회용 — 임시 하드코딩, 추후 삭제 예정
  private final CourseRepository courseRepository;
  private final CourseTagMapRepository courseTagMapRepository;

  // [/TEMP]

  @Transactional
  public List<MyRoadmapDto.Item> getMyRoadmaps(Long userId) {
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    Map<Long, Long> customToBuilderIdMap = repairAndBuildCustomToBuilderIdMap(userId, user);
    return customRoadmapRepository.findAllByUserOrderByUpdatedAtDescCreatedAtDesc(user).stream()
        .map(
            roadmap ->
                MyRoadmapDto.Item.from(
                    roadmap,
                    resolveLastStudiedAt(userId, roadmap),
                    customToBuilderIdMap.get(roadmap.getId())))
        .sorted(
            Comparator.comparing(
                    this::resolveListItemActivityAt,
                    Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(
                    MyRoadmapDto.Item::getCreatedAt,
                    Comparator.nullsLast(Comparator.reverseOrder())))
        .toList();
  }

  @Transactional
  public MyRoadmapDto.DetailResponse getMyRoadmap(Long userId, Long customRoadmapId) {
    CustomRoadmap customRoadmap = getOwnedRoadmap(userId, customRoadmapId);
    courseCompletionTagService.syncCompletedCourseTags(userId);

    List<CustomRoadmapNode> customNodes =
        customRoadmapNodeRepository.findAllByCustomRoadmapOrderByCustomSortOrderAsc(customRoadmap);
    prerequisiteSyncService.ensurePrerequisites(customRoadmap, customNodes);
    Map<Long, List<Long>> prerequisiteIdsByNodeId =
        customNodePrerequisiteRepository.findAllByCustomRoadmap(customRoadmap).stream()
            .collect(
                Collectors.groupingBy(
                    prerequisite -> prerequisite.getCustomNode().getId(),
                    Collectors.mapping(
                        prerequisite -> prerequisite.getPrerequisiteCustomNode().getId(),
                        Collectors.toList())));

    Map<Long, NodeStatus> statusByNodeId =
        customNodes.stream()
            .collect(Collectors.toMap(CustomRoadmapNode::getId, CustomRoadmapNode::getStatus));

    Map<Long, NodeClearance> clearanceByNodeId =
        customRoadmap.getOriginalRoadmap() != null
            ? nodeClearanceRepository
                .findAllByUserIdAndNodeRoadmapRoadmapIdOrderByNodeSortOrderAscNodeNodeIdAsc(
                    userId, customRoadmap.getOriginalRoadmap().getRoadmapId())
                .stream()
                .collect(Collectors.toMap(c -> c.getNode().getNodeId(), c -> c))
            : Map.of();

    List<Long> originalNodeIds =
        customNodes.stream()
            .filter(node -> node.getOriginalNode() != null)
            .map(node -> node.getOriginalNode().getNodeId())
            .toList();
    Map<Long, List<RoadmapNodeResource>> resourcesByNodeId =
        originalNodeIds.isEmpty()
            ? Map.of()
            : roadmapNodeResourceRepository.findActiveByNodeIds(originalNodeIds).stream()
                .collect(Collectors.groupingBy(resource -> resource.getNode().getNodeId()));

    Map<Long, List<String>> requiredTagsByNodeId =
        originalNodeIds.isEmpty()
            ? Map.of()
            : nodeRequiredTagRepository.findTagNamesByNodeIds(originalNodeIds).stream()
                .collect(
                    Collectors.groupingBy(
                        p -> p.getNodeId(),
                        Collectors.mapping(p -> p.getTagName(), Collectors.toList())));
    Set<String> userTags = normalizeTags(userTechStackRepository.findTagNamesByUserId(userId));
    Map<Long, Boolean> requiredTagsSatisfiedByNodeId =
        requiredTagsByNodeId.entrySet().stream()
            .collect(
                Collectors.toMap(
                    Map.Entry::getKey,
                    entry -> areRequiredTagsSatisfied(entry.getValue(), userTags)));

    return MyRoadmapDto.DetailResponse.from(
        customRoadmap,
        roadmapProgressService.calculateProgressRate(customNodes),
        customNodes,
        prerequisiteIdsByNodeId,
        statusByNodeId,
        clearanceByNodeId,
        resourcesByNodeId,
        requiredTagsByNodeId,
        requiredTagsSatisfiedByNodeId);
  }

  // [TEMP] 추천 무료 강좌 courseId 조회 — 임시 하드코딩, 추후 삭제 예정
  @Transactional(readOnly = true)
  public Long getRecommendedFreeCourseId(Long userId, Long customRoadmapId, Long customNodeId) {
    CustomRoadmap customRoadmap = getOwnedRoadmap(userId, customRoadmapId);
    CustomRoadmapNode node =
        customRoadmapNodeRepository
            .findById(customNodeId)
            .orElseThrow(() -> new CustomException(ErrorCode.CUSTOM_NODE_NOT_FOUND));

    if (!node.getCustomRoadmap().getId().equals(customRoadmap.getId())) {
      throw new CustomException(ErrorCode.FORBIDDEN);
    }

    if (node.getOriginalNode() == null) return null;

    // 1차: '로드맵 실전: {노드제목}' 패턴 무료 강좌 직접 매칭
    String targetTitle = "로드맵 실전: " + node.getOriginalNode().getTitle();
    Long courseId =
        courseRepository
            .findFirstByTitleAndStatus(targetTitle, CourseStatus.PUBLISHED)
            .map(c -> c.getCourseId())
            .orElse(null);

    if (courseId != null) return courseId;

    // 2차: 노드 필수 태그로 무료 공개 강좌 탐색
    List<String> tags =
        nodeRequiredTagRepository.findTagNamesByNodeId(node.getOriginalNode().getNodeId());
    if (tags.isEmpty()) return null;

    List<Long> ids =
        courseTagMapRepository.findFreePublishedCourseIdsByTagNames(tags, CourseStatus.PUBLISHED);
    return ids.isEmpty() ? null : ids.get(0);
  }

  // [/TEMP]

  @Transactional
  public MyRoadmapDto.Item renameMyRoadmap(Long userId, Long customRoadmapId, String newTitle) {
    CustomRoadmap roadmap = getOwnedRoadmap(userId, customRoadmapId);
    roadmap.changeTitle(newTitle);
    LocalDateTime lastStudiedAt = resolveLastStudiedAt(userId, roadmap);
    Long builderRoadmapId =
        myRoadmapRepository.buildCustomToMyRoadmapIdMap(userId).get(roadmap.getId());
    return MyRoadmapDto.Item.from(roadmap, lastStudiedAt, builderRoadmapId);
  }

  @Transactional
  public void deleteMyRoadmap(Long userId, Long customRoadmapId) {
    CustomRoadmap roadmap = getOwnedRoadmap(userId, customRoadmapId);
    customNodePrerequisiteRepository.deleteAllByCustomRoadmap(roadmap);
    customRoadmapNodeRepository.deleteAllByCustomRoadmap(roadmap);
    customRoadmapRepository.delete(roadmap);
  }

  /**
   * customRoadmapId → myRoadmapId 매핑을 반환한다. linkCustomRoadmap() 이전에 생성된 기존 로드맵은 title+user 기준으로 매핑을
   * 복구하고 DB에 저장한다.
   */
  /**
   * customRoadmapId → myRoadmapId 매핑을 반환한다. customRoadmapId 링크가 없는 기존 로드맵은 title+user 기준으로 임시 매핑한다
   * (DB 수정 없음).
   */
  private Map<Long, Long> repairAndBuildCustomToBuilderIdMap(Long userId, User user) {
    Map<Long, Long> existing = myRoadmapRepository.buildCustomToMyRoadmapIdMap(userId);

    List<com.devpath.domain.builder.entity.MyRoadmap> unlinked =
        myRoadmapRepository.findAllByUserIdAndCustomRoadmapIdIsNull(userId);
    if (unlinked.isEmpty()) return existing;

    // 아직 매핑되지 않은 빌더 기원 CustomRoadmap (title → customRoadmapId)
    Map<String, Long> builderCustomByTitle =
        customRoadmapRepository.findAllByUserOrderByUpdatedAtDescCreatedAtDesc(user).stream()
            .filter(cr -> cr.isBuilderOrigin() && !existing.containsKey(cr.getId()))
            .collect(
                java.util.stream.Collectors.toMap(
                    com.devpath.domain.roadmap.entity.CustomRoadmap::getTitle,
                    com.devpath.domain.roadmap.entity.CustomRoadmap::getId,
                    (a, b) -> a));

    Map<Long, Long> result = new java.util.HashMap<>(existing);
    for (com.devpath.domain.builder.entity.MyRoadmap mr : unlinked) {
      Long customId = builderCustomByTitle.get(mr.getTitle());
      if (customId != null) {
        mr.linkCustomRoadmap(customId);
        result.put(customId, mr.getMyRoadmapId());
      }
    }

    return result;
  }

  private CustomRoadmap getOwnedRoadmap(Long userId, Long customRoadmapId) {
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

    CustomRoadmap roadmap =
        customRoadmapRepository
            .findById(customRoadmapId)
            .orElseThrow(() -> new CustomException(ErrorCode.CUSTOM_ROADMAP_NOT_FOUND));

    if (!roadmap.getUser().getId().equals(user.getId())) {
      throw new CustomException(ErrorCode.FORBIDDEN);
    }

    return roadmap;
  }

  private LocalDateTime resolveLastStudiedAt(Long userId, CustomRoadmap customRoadmap) {
    LocalDateTime roadmapActivityAt =
        latestOf(customRoadmap.getUpdatedAt(), customRoadmap.getCreatedAt());

    if (customRoadmap.getOriginalRoadmap() == null) {
      return roadmapActivityAt;
    }

    LocalDateTime nodeActivityAt =
        nodeClearanceRepository.findLatestActivityAtByUserIdAndRoadmapId(
            userId, customRoadmap.getOriginalRoadmap().getRoadmapId());

    return latestOf(roadmapActivityAt, nodeActivityAt);
  }

  private LocalDateTime resolveListItemActivityAt(MyRoadmapDto.Item item) {
    return latestOf(item.getLastStudiedAt(), latestOf(item.getUpdatedAt(), item.getCreatedAt()));
  }

  private LocalDateTime latestOf(LocalDateTime first, LocalDateTime second) {
    if (first == null) {
      return second;
    }
    if (second == null) {
      return first;
    }
    return first.isAfter(second) ? first : second;
  }

  private Set<String> normalizeTags(List<String> tags) {
    if (tags == null || tags.isEmpty()) {
      return Set.of();
    }

    return tags.stream()
        .filter(tag -> tag != null && !tag.isBlank())
        .map(tag -> tag.trim().toLowerCase(Locale.ROOT))
        .collect(Collectors.toCollection(LinkedHashSet::new));
  }

  private boolean areRequiredTagsSatisfied(List<String> requiredTags, Set<String> userTags) {
    if (requiredTags == null || requiredTags.isEmpty()) {
      return true;
    }

    Set<String> normalizedRequiredTags = normalizeTags(requiredTags);
    return !normalizedRequiredTags.isEmpty() && userTags.containsAll(normalizedRequiredTags);
  }
}
