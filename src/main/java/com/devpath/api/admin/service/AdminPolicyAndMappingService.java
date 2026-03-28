package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.PolicyGovernanceRequests.UpdateNodeMapping;
import com.devpath.api.admin.dto.PolicyGovernanceRequests.UpdateStreamingPolicy;
import com.devpath.api.admin.dto.PolicyGovernanceRequests.UpdateSystemPolicy;
import com.devpath.api.admin.dto.PolicyGovernanceResponses.CourseMappingCandidateItem;
import com.devpath.api.admin.dto.PolicyGovernanceResponses.MappingCandidatesResponse;
import com.devpath.api.admin.dto.PolicyGovernanceResponses.NodeCandidateItem;
import com.devpath.api.admin.dto.PolicyGovernanceResponses.SystemPolicyResponse;
import com.devpath.api.admin.dto.governance.CourseNodeMappingCandidateResponse;
import com.devpath.api.admin.dto.governance.CourseNodeMappingRequest;
import com.devpath.api.admin.dto.governance.StreamingPolicyUpdateRequest;
import com.devpath.api.admin.dto.governance.SystemPolicyUpdateRequest;
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
import com.devpath.domain.system.entity.SystemSetting;
import com.devpath.domain.system.repository.SystemSettingRepository;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AdminPolicyAndMappingService {

  private static final BigDecimal DEFAULT_PLATFORM_FEE_RATE =
      BigDecimal.valueOf(15.0).setScale(1, RoundingMode.HALF_UP);
  private static final BigDecimal DEFAULT_INSTRUCTOR_SETTLEMENT_RATE =
      BigDecimal.valueOf(85.0).setScale(1, RoundingMode.HALF_UP);
  private static final Boolean DEFAULT_HLS_ENCRYPTED = true;
  private static final Integer DEFAULT_MAX_CONCURRENT_DEVICES = 3;
  private static final BigDecimal HUNDRED = BigDecimal.valueOf(100).setScale(1, RoundingMode.HALF_UP);

  private final CourseRepository courseRepository;
  private final CourseTagMapRepository courseTagMapRepository;
  private final RoadmapNodeRepository roadmapNodeRepository;
  private final NodeRequiredTagRepository nodeRequiredTagRepository;
  private final TagValidationService tagValidationService;
  private final CourseNodeMappingRepository courseNodeMappingRepository;
  private final SystemSettingRepository systemSettingRepository;

  public AdminPolicyAndMappingService(
      CourseRepository courseRepository,
      CourseTagMapRepository courseTagMapRepository,
      RoadmapNodeRepository roadmapNodeRepository,
      NodeRequiredTagRepository nodeRequiredTagRepository,
      TagValidationService tagValidationService,
      CourseNodeMappingRepository courseNodeMappingRepository,
      SystemSettingRepository systemSettingRepository) {
    this.courseRepository = courseRepository;
    this.courseTagMapRepository = courseTagMapRepository;
    this.roadmapNodeRepository = roadmapNodeRepository;
    this.nodeRequiredTagRepository = nodeRequiredTagRepository;
    this.tagValidationService = tagValidationService;
    this.courseNodeMappingRepository = courseNodeMappingRepository;
    this.systemSettingRepository = systemSettingRepository;
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
            : buildRequiredTagsMap(
                candidateNodes.stream().map(RoadmapNode::getNodeId).toList());

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
        nodes.stream().map(node -> CourseNodeMapping.builder().course(course).node(node).build()).toList();

    courseNodeMappingRepository.saveAll(mappings);
  }

  @Transactional(readOnly = true)
  public SystemPolicyResponse getSystemPolicies() {
    SystemSetting setting = systemSettingRepository.findTopByOrderBySettingIdAsc().orElse(null);
    return toSystemPolicyResponse(setting);
  }

  public void updateSystemPolicies(UpdateSystemPolicy request) {
    SystemSetting setting = getOrCreateSystemSetting();

    BigDecimal platformFeeRate =
        request != null && request.getPlatformFeeRate() != null
            ? normalizeRate(request.getPlatformFeeRate())
            : setting.getPlatformFeeRate();
    BigDecimal instructorSettlementRate =
        request != null && request.getInstructorSettlementRate() != null
            ? normalizeRate(request.getInstructorSettlementRate())
            : setting.getInstructorSettlementRate();

    validateRatePair(platformFeeRate, instructorSettlementRate);
    setting.updateSystemPolicy(platformFeeRate, instructorSettlementRate);
  }

  public void updateStreamingPolicy(UpdateStreamingPolicy request) {
    SystemSetting setting = getOrCreateSystemSetting();

    Boolean hlsEncrypted =
        request != null && request.getIsHlsEncrypted() != null
            ? request.getIsHlsEncrypted()
            : setting.getIsHlsEncrypted();
    Integer maxConcurrentDevices =
        request != null && request.getMaxConcurrentDevices() != null
            ? request.getMaxConcurrentDevices()
            : setting.getMaxConcurrentDevices();

    if (hlsEncrypted == null || maxConcurrentDevices == null || maxConcurrentDevices <= 0) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    setting.updateStreamingPolicy(hlsEncrypted, maxConcurrentDevices);
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
            .map(node -> toNodeCandidateItem(node, courseTags, requiredTagsByNodeId.get(node.getNodeId())))
            .filter(candidate -> !candidate.getMatchedTags().isEmpty())
            .sorted(
                Comparator.comparing(NodeCandidateItem::getCoveragePercent).reversed()
                    .thenComparing(candidate -> candidate.getMissingTags().size())
                    .thenComparing(NodeCandidateItem::getRoadmapId)
                    .thenComparing(NodeCandidateItem::getSortOrder)
                    .thenComparing(NodeCandidateItem::getNodeId))
            .toList();

    List<Long> mappedNodeIds =
        mappedNodeIdsByCourseId.getOrDefault(course.getCourseId(), List.of()).stream().sorted().toList();

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
    List<String> missingTags = requiredTags.stream().filter(tag -> !courseTagSet.contains(tag)).toList();
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

      tempMap.computeIfAbsent(row.getNodeId(), key -> new LinkedHashSet<>()).add(row.getTagName().trim());
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
    for (CourseNodeMapping mapping : courseNodeMappingRepository.findAllByCourseCourseIdIn(courseIds)) {
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

  private BigDecimal normalizeRate(Double value) {
    if (value == null) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    BigDecimal normalized = BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP);
    if (normalized.compareTo(BigDecimal.ZERO) < 0 || normalized.compareTo(HUNDRED) > 0) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return normalized;
  }

  private void validateRatePair(BigDecimal platformFeeRate, BigDecimal instructorSettlementRate) {
    if (platformFeeRate.add(instructorSettlementRate).compareTo(HUNDRED) != 0) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }
  }

  private BigDecimal calculateCoveragePercent(int matchedCount, int requiredCount) {
    if (requiredCount == 0) {
      return BigDecimal.ZERO.setScale(1, RoundingMode.HALF_UP);
    }

    return BigDecimal.valueOf(matchedCount)
        .multiply(HUNDRED)
        .divide(BigDecimal.valueOf(requiredCount), 1, RoundingMode.HALF_UP);
  }

  // ===== 신규 거버넌스 API 메서드 =====

  @Transactional(readOnly = true)
  public List<CourseNodeMappingCandidateResponse> getMappingCandidatesSimple() {
    // TODO: 추후 AI 기반 태그 매칭 알고리즘 연동 예정
    MappingCandidatesResponse existing = getMappingCandidates();
    return existing.getCourses().stream()
        .map(item -> CourseNodeMappingCandidateResponse.builder()
            .courseId(item.getCourseId())
            .courseTitle(item.getCourseTitle())
            .suggestedNodeIds(item.getCandidates().stream()
                .map(NodeCandidateItem::getNodeId)
                .collect(Collectors.toList()))
            .tagMatchRate(item.getCandidates().isEmpty() ? 0.0 :
                item.getCandidates().stream()
                    .mapToDouble(c -> c.getCoveragePercent().doubleValue())
                    .average().orElse(0.0))
            .build())
        .collect(Collectors.toList());
  }

  public void applyNodeMapping(Long courseId, CourseNodeMappingRequest request) {
    Course course = courseRepository.findById(courseId)
        .orElseThrow(() -> new CustomException(ErrorCode.COURSE_NOT_FOUND));
    List<Long> nodeIds = normalizeUniqueIds(request == null ? null : request.getNodeIds());
    List<RoadmapNode> nodes = loadNodes(nodeIds);
    courseNodeMappingRepository.deleteAllByCourseCourseId(courseId);
    if (nodes.isEmpty()) {
      return;
    }
    List<com.devpath.domain.course.entity.CourseNodeMapping> mappings = nodes.stream()
        .map(node -> com.devpath.domain.course.entity.CourseNodeMapping.builder().course(course).node(node).build())
        .toList();
    courseNodeMappingRepository.saveAll(mappings);
  }

  @Transactional(readOnly = true)
  public com.devpath.api.admin.dto.governance.SystemPolicyResponse getSystemPoliciesSimple() {
    // TODO: refundPolicyDays, maxCoursePrice DB 연동 예정
    SystemSetting setting = systemSettingRepository.findTopByOrderBySettingIdAsc().orElse(null);
    Integer platformFeeRate = setting != null
        ? setting.getPlatformFeeRate().intValue() : 20;
    return com.devpath.api.admin.dto.governance.SystemPolicyResponse.builder()
        .platformFeeRate(platformFeeRate)
        .refundPolicyDays(7)
        .maxCoursePrice(null)
        .updatedAt(null)
        .build();
  }

  public void updateSystemPoliciesSimple(SystemPolicyUpdateRequest request) {
    // TODO: refundPolicyDays, maxCoursePrice 실제 정책 저장 연동 예정
    if (request != null && request.getPlatformFeeRate() != null) {
      SystemSetting setting = getOrCreateSystemSetting();
      BigDecimal platformFeeRate = normalizeRate(request.getPlatformFeeRate().doubleValue());
      BigDecimal instructorSettlementRate = HUNDRED.subtract(platformFeeRate);
      validateRatePair(platformFeeRate, instructorSettlementRate);
      setting.updateSystemPolicy(platformFeeRate, instructorSettlementRate);
    }
  }

  public void updateStreamingPolicySimple(StreamingPolicyUpdateRequest request) {
    // TODO: maxResolution, watermarkEnabled 실제 정책 저장 연동 예정
    SystemSetting setting = getOrCreateSystemSetting();
    Boolean hlsEncrypted = request != null && request.getHlsEnabled() != null
        ? request.getHlsEnabled() : setting.getIsHlsEncrypted();
    Integer maxConcurrentDevices = setting.getMaxConcurrentDevices();

    if (hlsEncrypted == null || maxConcurrentDevices == null || maxConcurrentDevices <= 0) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    setting.updateStreamingPolicy(hlsEncrypted, maxConcurrentDevices);
  }

  private SystemSetting getOrCreateSystemSetting() {
    return systemSettingRepository
        .findTopByOrderBySettingIdAsc()
        .orElseGet(
            () ->
                systemSettingRepository.save(
                    SystemSetting.builder()
                        .platformFeeRate(DEFAULT_PLATFORM_FEE_RATE)
                        .instructorSettlementRate(DEFAULT_INSTRUCTOR_SETTLEMENT_RATE)
                        .isHlsEncrypted(DEFAULT_HLS_ENCRYPTED)
                        .maxConcurrentDevices(DEFAULT_MAX_CONCURRENT_DEVICES)
                        .build()));
  }

  private SystemPolicyResponse toSystemPolicyResponse(SystemSetting setting) {
    if (setting == null) {
      return SystemPolicyResponse.builder()
          .platformFeeRate(DEFAULT_PLATFORM_FEE_RATE)
          .instructorSettlementRate(DEFAULT_INSTRUCTOR_SETTLEMENT_RATE)
          .isHlsEncrypted(DEFAULT_HLS_ENCRYPTED)
          .maxConcurrentDevices(DEFAULT_MAX_CONCURRENT_DEVICES)
          .build();
    }

    return SystemPolicyResponse.builder()
        .platformFeeRate(setting.getPlatformFeeRate())
        .instructorSettlementRate(setting.getInstructorSettlementRate())
        .isHlsEncrypted(setting.getIsHlsEncrypted())
        .maxConcurrentDevices(setting.getMaxConcurrentDevices())
        .build();
  }
}
