package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.InstructorNodeCoverageDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseTagMapRepository;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 강의 태그 기반 노드 커버리지 조회 로직을 처리한다.
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstructorNodeCoverageQueryService {

  private final UserRepository userRepository;
  private final CourseRepository courseRepository;
  private final CourseTagMapRepository courseTagMapRepository;
  private final RoadmapNodeRepository roadmapNodeRepository;
  private final NodeRequiredTagRepository nodeRequiredTagRepository;

  // 강의 태그와 노드 필수 태그를 비교해 노드별 커버리지를 조회한다.
  public InstructorNodeCoverageDto.NodeCoverageResponse getNodeCoverages(
      Long instructorId, Long courseId) {
    validateAuthenticatedUser(instructorId);
    Course course = getOwnedCourse(instructorId, courseId);

    List<String> courseTags =
        courseTagMapRepository.findTagNamesByCourseId(courseId).stream()
            .filter(Objects::nonNull)
            .map(String::trim)
            .filter(tagName -> !tagName.isBlank())
            .distinct()
            .toList();

    if (courseTags.isEmpty()) {
      return InstructorNodeCoverageDto.NodeCoverageResponse.builder()
          .courseId(course.getCourseId())
          .courseTitle(course.getTitle())
          .courseTags(List.of())
          .totalNodes(0)
          .nodeCoverages(List.of())
          .build();
    }

    List<RoadmapNode> candidateNodes = roadmapNodeRepository.findAllOfficialPublicNodes();

    if (candidateNodes.isEmpty()) {
      return InstructorNodeCoverageDto.NodeCoverageResponse.builder()
          .courseId(course.getCourseId())
          .courseTitle(course.getTitle())
          .courseTags(courseTags)
          .totalNodes(0)
          .nodeCoverages(List.of())
          .build();
    }

    List<Long> nodeIds = candidateNodes.stream().map(RoadmapNode::getNodeId).toList();
    Map<Long, List<String>> requiredTagsByNodeId = buildRequiredTagsMap(nodeIds);
    LinkedHashSet<String> courseTagSet = new LinkedHashSet<>(courseTags);

    List<InstructorNodeCoverageDto.NodeCoverageItem> nodeCoverages =
        candidateNodes.stream()
            .filter(node -> requiredTagsByNodeId.containsKey(node.getNodeId()))
            .map(node -> toNodeCoverageItem(node, requiredTagsByNodeId.get(node.getNodeId()), courseTagSet))
            .sorted(
                (a, b) -> {
                  int coverageCompare = b.getCoveragePercent().compareTo(a.getCoveragePercent());
                  if (coverageCompare != 0) {
                    return coverageCompare;
                  }

                  int missingCompare =
                      Integer.compare(a.getMissingTags().size(), b.getMissingTags().size());
                  if (missingCompare != 0) {
                    return missingCompare;
                  }

                  int roadmapCompare = a.getRoadmapId().compareTo(b.getRoadmapId());
                  if (roadmapCompare != 0) {
                    return roadmapCompare;
                  }

                  int sortOrderCompare = Integer.compare(a.getSortOrder(), b.getSortOrder());
                  if (sortOrderCompare != 0) {
                    return sortOrderCompare;
                  }

                  return a.getNodeId().compareTo(b.getNodeId());
                })
            .toList();

    return InstructorNodeCoverageDto.NodeCoverageResponse.builder()
        .courseId(course.getCourseId())
        .courseTitle(course.getTitle())
        .courseTags(courseTags)
        .totalNodes(nodeCoverages.size())
        .nodeCoverages(nodeCoverages)
        .build();
  }

  // 노드 엔티티와 태그 목록으로 커버리지 응답 항목을 만든다.
  private InstructorNodeCoverageDto.NodeCoverageItem toNodeCoverageItem(
      RoadmapNode node, List<String> requiredTags, LinkedHashSet<String> courseTagSet) {
    List<String> matchedTags = requiredTags.stream().filter(courseTagSet::contains).toList();

    List<String> missingTags =
        requiredTags.stream().filter(requiredTag -> !courseTagSet.contains(requiredTag)).toList();

    BigDecimal coveragePercent = calculateCoveragePercent(matchedTags.size(), requiredTags.size());

    return InstructorNodeCoverageDto.NodeCoverageItem.builder()
        .roadmapId(node.getRoadmap().getRoadmapId())
        .roadmapTitle(node.getRoadmap().getTitle())
        .nodeId(node.getNodeId())
        .nodeTitle(node.getTitle())
        .nodeType(node.getNodeType())
        .sortOrder(node.getSortOrder())
        .requiredTags(requiredTags)
        .matchedTags(matchedTags)
        .missingTags(missingTags)
        .coveragePercent(coveragePercent)
        .build();
  }

  // 필수 태그 개수 대비 일치 태그 개수로 커버리지 퍼센트를 계산한다.
  private BigDecimal calculateCoveragePercent(int matchedCount, int requiredCount) {
    if (requiredCount == 0) {
      return BigDecimal.ZERO.setScale(1, RoundingMode.HALF_UP);
    }

    return BigDecimal.valueOf(matchedCount)
        .multiply(BigDecimal.valueOf(100))
        .divide(BigDecimal.valueOf(requiredCount), 1, RoundingMode.HALF_UP);
  }

  // 노드별 필수 태그 목록을 맵으로 만든다.
  private Map<Long, List<String>> buildRequiredTagsMap(List<Long> nodeIds) {
    List<NodeRequiredTagRepository.NodeRequiredTagNameProjection> rows =
        nodeRequiredTagRepository.findTagNamesByNodeIds(nodeIds);

    Map<Long, LinkedHashSet<String>> tempMap = new LinkedHashMap<>();

    for (NodeRequiredTagRepository.NodeRequiredTagNameProjection row : rows) {
      tempMap.computeIfAbsent(row.getNodeId(), key -> new LinkedHashSet<>()).add(row.getTagName());
    }

    Map<Long, List<String>> requiredTagsByNodeId = new LinkedHashMap<>();

    for (Map.Entry<Long, LinkedHashSet<String>> entry : tempMap.entrySet()) {
      requiredTagsByNodeId.put(entry.getKey(), entry.getValue().stream().toList());
    }

    return requiredTagsByNodeId;
  }

  // 현재 로그인한 사용자가 존재하는지 검증한다.
  private void validateAuthenticatedUser(Long instructorId) {
    if (instructorId == null) {
      throw new CustomException(ErrorCode.UNAUTHORIZED);
    }

    if (!userRepository.existsById(instructorId)) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
  }

  // 현재 로그인한 강사가 소유한 강의인지 검증하며 조회한다.
  private Course getOwnedCourse(Long instructorId, Long courseId) {
    return courseRepository.findByCourseIdAndInstructorId(courseId, instructorId)
        .orElseGet(
            () -> {
              if (courseRepository.existsById(courseId)) {
                throw new CustomException(ErrorCode.FORBIDDEN);
              }
              throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND);
            });
  }
}
