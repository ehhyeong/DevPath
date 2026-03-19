package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.InstructorNodeClassificationDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseTagMapRepository;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.service.TagValidationService;
import com.devpath.domain.user.repository.UserRepository;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 강의 태그 기반 자동 노드 분류 조회 로직을 처리한다.
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstructorNodeClassificationQueryService {

  private final UserRepository userRepository;
  private final CourseRepository courseRepository;
  private final CourseTagMapRepository courseTagMapRepository;
  private final RoadmapNodeRepository roadmapNodeRepository;
  private final NodeRequiredTagRepository nodeRequiredTagRepository;
  private final TagValidationService tagValidationService;

  // 강의 태그와 노드 필수 태그를 비교해 자동 분류 결과를 조회한다.
  public InstructorNodeClassificationDto.AutoClassificationResponse getAutoClassifications(
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
      return InstructorNodeClassificationDto.AutoClassificationResponse.builder()
          .courseId(course.getCourseId())
          .courseTitle(course.getTitle())
          .courseTags(List.of())
          .totalMatchedNodes(0)
          .matchedNodes(List.of())
          .build();
    }

    List<RoadmapNode> candidateNodes = roadmapNodeRepository.findAllOfficialPublicNodes();

    if (candidateNodes.isEmpty()) {
      return InstructorNodeClassificationDto.AutoClassificationResponse.builder()
          .courseId(course.getCourseId())
          .courseTitle(course.getTitle())
          .courseTags(courseTags)
          .totalMatchedNodes(0)
          .matchedNodes(List.of())
          .build();
    }

    List<Long> nodeIds = candidateNodes.stream().map(RoadmapNode::getNodeId).toList();
    Map<Long, List<String>> requiredTagsByNodeId = buildRequiredTagsMap(nodeIds);

    List<InstructorNodeClassificationDto.MatchedNodeItem> matchedNodes =
        candidateNodes.stream()
            .filter(node -> requiredTagsByNodeId.containsKey(node.getNodeId()))
            .filter(
                node ->
                    tagValidationService.validateTags(
                        requiredTagsByNodeId.get(node.getNodeId()), courseTags))
            .map(
                node ->
                    InstructorNodeClassificationDto.MatchedNodeItem.builder()
                        .roadmapId(node.getRoadmap().getRoadmapId())
                        .roadmapTitle(node.getRoadmap().getTitle())
                        .nodeId(node.getNodeId())
                        .nodeTitle(node.getTitle())
                        .nodeType(node.getNodeType())
                        .sortOrder(node.getSortOrder())
                        .requiredTags(requiredTagsByNodeId.get(node.getNodeId()))
                        .build())
            .toList();

    return InstructorNodeClassificationDto.AutoClassificationResponse.builder()
        .courseId(course.getCourseId())
        .courseTitle(course.getTitle())
        .courseTags(courseTags)
        .totalMatchedNodes(matchedNodes.size())
        .matchedNodes(matchedNodes)
        .build();
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
