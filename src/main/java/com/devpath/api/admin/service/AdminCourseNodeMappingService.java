package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.PolicyGovernanceRequests.UpdateNodeMapping;
import com.devpath.api.admin.dto.PolicyGovernanceResponses.CourseMappingCandidateItem;
import com.devpath.api.admin.dto.PolicyGovernanceResponses.MappingCandidatesResponse;
import com.devpath.api.admin.dto.PolicyGovernanceResponses.NodeCandidateItem;
import com.devpath.api.admin.dto.governance.CourseNodeMappingCandidateResponse;
import com.devpath.api.admin.dto.governance.CourseNodeMappingRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseNodeMapping;
import com.devpath.domain.course.repository.CourseNodeMappingRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseTagMapRepository;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.service.TagValidationService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AdminCourseNodeMappingService {

  private static final BigDecimal HUNDRED =
      BigDecimal.valueOf(100).setScale(1, RoundingMode.HALF_UP);

  private final CourseRepository courseRepository;
  private final CourseTagMapRepository courseTagMapRepository;
  private final RoadmapNodeRepository roadmapNodeRepository;
  private final NodeRequiredTagRepository nodeRequiredTagRepository;
  private final TagValidationService tagValidationService;
  private final CourseNodeMappingRepository courseNodeMappingRepository;
  private final ObjectProvider<AdminCourseNodeMappingAiClient> mappingAiClientProvider;

  public AdminCourseNodeMappingService(
      CourseRepository courseRepository,
      CourseTagMapRepository courseTagMapRepository,
      RoadmapNodeRepository roadmapNodeRepository,
      NodeRequiredTagRepository nodeRequiredTagRepository,
      TagValidationService tagValidationService,
      CourseNodeMappingRepository courseNodeMappingRepository,
      ObjectProvider<AdminCourseNodeMappingAiClient> mappingAiClientProvider) {
    this.courseRepository = courseRepository;
    this.courseTagMapRepository = courseTagMapRepository;
    this.roadmapNodeRepository = roadmapNodeRepository;
    this.nodeRequiredTagRepository = nodeRequiredTagRepository;
    this.tagValidationService = tagValidationService;
    this.courseNodeMappingRepository = courseNodeMappingRepository;
    this.mappingAiClientProvider = mappingAiClientProvider;
  }

  @Transactional(readOnly = true)
  public MappingCandidatesResponse getMappingCandidates() {
    List<Course> courses =
        courseRepository.findAll().stream()
            .sorted(Comparator.comparing(Course::getCourseId))
            .toList();

    if (courses.isEmpty()) {
      return MappingCandidatesResponse.builder().totalCourses(0).courses(List.of()).build();
    }

    List<RoadmapNode> candidateNodes = roadmapNodeRepository.findAllOfficialPublicNodes();
    Map<Long, List<String>> requiredTagsByNodeId =
        candidateNodes.isEmpty()
            ? Map.of()
            : buildRequiredTagsMap(candidateNodes.stream().map(RoadmapNode::getNodeId).toList());

    List<Long> courseIds = courses.stream().map(Course::getCourseId).toList();
    Map<Long, List<Long>> mappedNodeIdsByCourseId = buildMappedNodeIdsMap(courseIds);

    List<CourseMappingCandidateItem> courseItems =
        courses.stream()
            .map(
                course ->
                    toCourseMappingCandidateItem(
                        course, candidateNodes, requiredTagsByNodeId, mappedNodeIdsByCourseId))
            .toList();

    return MappingCandidatesResponse.builder()
        .totalCourses(courseItems.size())
        .courses(courseItems)
        .build();
  }

  public void updateCourseNodeMapping(Long courseId, UpdateNodeMapping request) {
    Course course =
        courseRepository
            .findById(courseId)
            .orElseThrow(() -> new CustomException(ErrorCode.COURSE_NOT_FOUND));

    List<Long> mappedNodeIds =
        normalizeUniqueIds(request == null ? null : request.getMappedNodeIds());
    List<RoadmapNode> nodes = loadNodes(mappedNodeIds);

    courseNodeMappingRepository.deleteAllByCourseCourseId(courseId);

    if (nodes.isEmpty()) {
      return;
    }

    List<CourseNodeMapping> mappings =
        nodes.stream()
            .map(node -> CourseNodeMapping.builder().course(course).node(node).build())
            .toList();

    courseNodeMappingRepository.saveAll(mappings);
  }

  private CourseMappingCandidateItem toCourseMappingCandidateItem(
      Course course,
      List<RoadmapNode> candidateNodes,
      Map<Long, List<String>> requiredTagsByNodeId,
      Map<Long, List<Long>> mappedNodeIdsByCourseId) {
    List<String> courseTags = loadCourseTags(course.getCourseId());

    List<NodeCandidateItem> candidates =
        candidateNodes.stream()
            .filter(node -> requiredTagsByNodeId.containsKey(node.getNodeId()))
            .map(
                node ->
                    toNodeCandidateItem(
                        node, courseTags, requiredTagsByNodeId.get(node.getNodeId())))
            .filter(candidate -> !candidate.getMatchedTags().isEmpty())
            .sorted(
                Comparator.comparing(NodeCandidateItem::getCoveragePercent)
                    .reversed()
                    .thenComparing(candidate -> candidate.getMissingTags().size())
                    .thenComparing(NodeCandidateItem::getRoadmapId)
                    .thenComparing(NodeCandidateItem::getSortOrder)
                    .thenComparing(NodeCandidateItem::getNodeId))
            .toList();

    List<Long> mappedNodeIds =
        mappedNodeIdsByCourseId.getOrDefault(course.getCourseId(), List.of()).stream()
            .sorted()
            .toList();

    return CourseMappingCandidateItem.builder()
        .courseId(course.getCourseId())
        .courseTitle(course.getTitle())
        .courseStatus(course.getStatus().name())
        .courseTags(courseTags)
        .mappedNodeIds(mappedNodeIds)
        .totalCandidates(candidates.size())
        .candidates(candidates)
        .build();
  }

  private NodeCandidateItem toNodeCandidateItem(
      RoadmapNode node, List<String> courseTags, List<String> requiredTags) {
    LinkedHashSet<String> courseTagSet = new LinkedHashSet<>(courseTags);
    List<String> missingTags =
        requiredTags.stream().filter(tag -> !courseTagSet.contains(tag)).toList();
    List<String> matchedTags = requiredTags.stream().filter(courseTagSet::contains).toList();
    BigDecimal coveragePercent = calculateCoveragePercent(matchedTags.size(), requiredTags.size());
    boolean fullyMatched = tagValidationService.validateTags(requiredTags, courseTags);

    return NodeCandidateItem.builder()
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
        .fullyMatched(fullyMatched)
        .build();
  }

  private Map<Long, List<String>> buildRequiredTagsMap(List<Long> nodeIds) {
    if (nodeIds.isEmpty()) {
      return Map.of();
    }

    List<NodeRequiredTagRepository.NodeRequiredTagNameProjection> rows =
        nodeRequiredTagRepository.findTagNamesByNodeIds(nodeIds);

    Map<Long, LinkedHashSet<String>> tempMap = new LinkedHashMap<>();
    for (NodeRequiredTagRepository.NodeRequiredTagNameProjection row : rows) {
      if (row.getTagName() == null || row.getTagName().isBlank()) {
        continue;
      }

      tempMap
          .computeIfAbsent(row.getNodeId(), key -> new LinkedHashSet<>())
          .add(row.getTagName().trim());
    }

    Map<Long, List<String>> requiredTagsByNodeId = new LinkedHashMap<>();
    for (Map.Entry<Long, LinkedHashSet<String>> entry : tempMap.entrySet()) {
      requiredTagsByNodeId.put(entry.getKey(), entry.getValue().stream().toList());
    }

    return requiredTagsByNodeId;
  }

  private Map<Long, List<Long>> buildMappedNodeIdsMap(Collection<Long> courseIds) {
    if (courseIds.isEmpty()) {
      return Map.of();
    }

    Map<Long, LinkedHashSet<Long>> tempMap = new LinkedHashMap<>();
    for (CourseNodeMapping mapping :
        courseNodeMappingRepository.findAllByCourseCourseIdIn(courseIds)) {
      tempMap
          .computeIfAbsent(mapping.getCourse().getCourseId(), key -> new LinkedHashSet<>())
          .add(mapping.getNode().getNodeId());
    }

    Map<Long, List<Long>> mappedNodeIdsByCourseId = new LinkedHashMap<>();
    for (Map.Entry<Long, LinkedHashSet<Long>> entry : tempMap.entrySet()) {
      mappedNodeIdsByCourseId.put(entry.getKey(), entry.getValue().stream().toList());
    }

    return mappedNodeIdsByCourseId;
  }

  private List<String> loadCourseTags(Long courseId) {
    return courseTagMapRepository.findTagNamesByCourseId(courseId).stream()
        .filter(Objects::nonNull)
        .map(String::trim)
        .filter(tag -> !tag.isBlank())
        .distinct()
        .toList();
  }

  private List<RoadmapNode> loadNodes(List<Long> nodeIds) {
    if (nodeIds.isEmpty()) {
      return List.of();
    }

    List<RoadmapNode> nodes = roadmapNodeRepository.findAllById(nodeIds);
    if (nodes.size() != nodeIds.size()) {
      throw new CustomException(ErrorCode.ROADMAP_NODE_NOT_FOUND);
    }

    Map<Long, RoadmapNode> nodesById = new LinkedHashMap<>();
    for (RoadmapNode node : nodes) {
      nodesById.put(node.getNodeId(), node);
    }

    return nodeIds.stream().map(nodesById::get).toList();
  }

  private List<Long> normalizeUniqueIds(List<Long> values) {
    if (values == null || values.isEmpty()) {
      return List.of();
    }

    LinkedHashSet<Long> uniqueIds = new LinkedHashSet<>();
    for (Long value : values) {
      if (value == null || !uniqueIds.add(value)) {
        throw new CustomException(ErrorCode.INVALID_INPUT);
      }
    }

    return uniqueIds.stream().toList();
  }

  private BigDecimal calculateCoveragePercent(int matchedCount, int requiredCount) {
    if (requiredCount == 0) {
      return BigDecimal.ZERO.setScale(1, RoundingMode.HALF_UP);
    }

    return BigDecimal.valueOf(matchedCount)
        .multiply(HUNDRED)
        .divide(BigDecimal.valueOf(requiredCount), 1, RoundingMode.HALF_UP);
  }

  @Transactional(readOnly = true)
  public List<CourseNodeMappingCandidateResponse> getMappingCandidatesSimple() {
    MappingCandidatesResponse existing = getMappingCandidates();
    return existing.getCourses().stream()
        .map(
            item -> toSimpleMappingCandidate(item, selectTagBasedSuggestions(item), "TAG_COVERAGE"))
        .collect(Collectors.toList());
  }

  @Transactional(readOnly = true)
  public CourseNodeMappingCandidateResponse getAiMappingCandidate(Long courseId) {
    CourseMappingCandidateItem course =
        getMappingCandidates().getCourses().stream()
            .filter(item -> item.getCourseId().equals(courseId))
            .findFirst()
            .orElseThrow(() -> new CustomException(ErrorCode.COURSE_NOT_FOUND));

    AdminCourseNodeMappingAiClient aiClient = mappingAiClientProvider.getIfAvailable();
    List<Long> aiSuggestions = aiClient == null ? List.of() : aiClient.recommend(course);
    if (!aiSuggestions.isEmpty()) {
      return toSimpleMappingCandidate(course, aiSuggestions, "GEMINI");
    }
    return toSimpleMappingCandidate(course, selectTagBasedSuggestions(course), "TAG_COVERAGE");
  }

  private CourseNodeMappingCandidateResponse toSimpleMappingCandidate(
      CourseMappingCandidateItem course, List<Long> suggestedNodeIds, String source) {
    Map<Long, NodeCandidateItem> candidateMap =
        course.getCandidates().stream()
            .collect(Collectors.toMap(NodeCandidateItem::getNodeId, item -> item));
    double matchRate =
        suggestedNodeIds.stream()
            .map(candidateMap::get)
            .filter(Objects::nonNull)
            .mapToDouble(item -> item.getCoveragePercent().doubleValue())
            .average()
            .orElse(0.0);

    return CourseNodeMappingCandidateResponse.builder()
        .courseId(course.getCourseId())
        .courseTitle(course.getCourseTitle())
        .courseTags(course.getCourseTags())
        .mappedNodeIds(course.getMappedNodeIds())
        .suggestedNodeIds(suggestedNodeIds)
        .tagMatchRate(matchRate)
        .recommendationSource(source)
        .build();
  }

  private List<Long> selectTagBasedSuggestions(CourseMappingCandidateItem course) {
    List<Long> strongMatches =
        course.getCandidates().stream()
            .filter(
                candidate ->
                    Boolean.TRUE.equals(candidate.getFullyMatched())
                        || candidate.getCoveragePercent().compareTo(BigDecimal.valueOf(50)) >= 0)
            .limit(5)
            .map(NodeCandidateItem::getNodeId)
            .toList();
    if (!strongMatches.isEmpty()) {
      return strongMatches;
    }
    return course.getCandidates().stream().limit(3).map(NodeCandidateItem::getNodeId).toList();
  }

  public void applyNodeMapping(Long courseId, CourseNodeMappingRequest request) {
    Course course =
        courseRepository
            .findById(courseId)
            .orElseThrow(() -> new CustomException(ErrorCode.COURSE_NOT_FOUND));
    List<Long> nodeIds = normalizeUniqueIds(request == null ? null : request.getNodeIds());
    List<RoadmapNode> nodes = loadNodes(nodeIds);
    courseNodeMappingRepository.deleteAllByCourseCourseId(courseId);
    if (nodes.isEmpty()) {
      return;
    }
    List<com.devpath.domain.course.entity.CourseNodeMapping> mappings =
        nodes.stream()
            .map(
                node ->
                    com.devpath.domain.course.entity.CourseNodeMapping.builder()
                        .course(course)
                        .node(node)
                        .build())
            .toList();
    courseNodeMappingRepository.saveAll(mappings);
  }
}
