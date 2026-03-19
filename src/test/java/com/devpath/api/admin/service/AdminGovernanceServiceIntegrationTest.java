package com.devpath.api.admin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devpath.api.admin.dto.NodeGovernanceRequests.UpdateCompletionRule;
import com.devpath.api.admin.dto.NodeGovernanceRequests.UpdateNodeType;
import com.devpath.api.admin.dto.NodeGovernanceRequests.UpdatePrerequisites;
import com.devpath.api.admin.dto.NodeGovernanceRequests.UpdateRequiredTags;
import com.devpath.api.admin.dto.PolicyGovernanceRequests.UpdateNodeMapping;
import com.devpath.api.admin.dto.PolicyGovernanceRequests.UpdateStreamingPolicy;
import com.devpath.api.admin.dto.PolicyGovernanceRequests.UpdateSystemPolicy;
import com.devpath.api.admin.dto.PolicyGovernanceResponses.CourseMappingCandidateItem;
import com.devpath.api.admin.dto.PolicyGovernanceResponses.MappingCandidatesResponse;
import com.devpath.api.admin.dto.PolicyGovernanceResponses.SystemPolicyResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseNodeMapping;
import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.entity.CourseTagMap;
import com.devpath.domain.course.repository.CourseNodeMappingRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseTagMapRepository;
import com.devpath.domain.roadmap.entity.NodeCompletionRule;
import com.devpath.domain.roadmap.entity.NodeRequiredTag;
import com.devpath.domain.roadmap.entity.Prerequisite;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.NodeCompletionRuleRepository;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.PrerequisiteRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.roadmap.service.TagValidationService;
import com.devpath.domain.system.repository.SystemSettingRepository;
import com.devpath.domain.user.entity.Tag;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.entity.UserTechStack;
import com.devpath.domain.user.repository.TagRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.test.util.ReflectionTestUtils;

@DataJpaTest(
    properties = {
      "spring.jpa.hibernate.ddl-auto=create-drop",
      "spring.sql.init.mode=never",
      "spring.jpa.defer-datasource-initialization=false"
    })
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Import({
  AdminCourseGovernanceService.class,
  AdminNodeGovernanceService.class,
  AdminPolicyAndMappingService.class,
  AdminTagGovernanceService.class,
  TagValidationService.class
})
class AdminGovernanceServiceIntegrationTest {

  @Autowired private AdminCourseGovernanceService adminCourseGovernanceService;
  @Autowired private AdminNodeGovernanceService adminNodeGovernanceService;
  @Autowired private AdminPolicyAndMappingService adminPolicyAndMappingService;
  @Autowired private AdminTagGovernanceService adminTagGovernanceService;

  @Autowired private UserRepository userRepository;
  @Autowired private TagRepository tagRepository;
  @Autowired private CourseRepository courseRepository;
  @Autowired private CourseTagMapRepository courseTagMapRepository;
  @Autowired private CourseNodeMappingRepository courseNodeMappingRepository;
  @Autowired private RoadmapRepository roadmapRepository;
  @Autowired private RoadmapNodeRepository roadmapNodeRepository;
  @Autowired private NodeRequiredTagRepository nodeRequiredTagRepository;
  @Autowired private PrerequisiteRepository prerequisiteRepository;
  @Autowired private NodeCompletionRuleRepository nodeCompletionRuleRepository;
  @Autowired private UserTechStackRepository userTechStackRepository;
  @Autowired private SystemSettingRepository systemSettingRepository;
  @Autowired private EntityManager entityManager;

  @Test
  @DisplayName("승인 대기 강의를 조회하고 승인과 반려를 반영한다")
  void approveAndRejectPendingCourse() {
    User instructor = saveUser("pending-admin@devpath.com", UserRole.ROLE_INSTRUCTOR);
    Course course = saveCourse(instructor, "Pending Course", CourseStatus.IN_REVIEW);

    assertThat(adminCourseGovernanceService.getPendingCourses()).hasSize(1);

    adminCourseGovernanceService.approveCourse(course.getCourseId());
    flushAndClear();

    assertThat(courseRepository.findById(course.getCourseId())).get().extracting(Course::getStatus)
        .isEqualTo(CourseStatus.PUBLISHED);

    adminCourseGovernanceService.rejectCourse(course.getCourseId());
    flushAndClear();

    assertThat(courseRepository.findById(course.getCourseId())).get().extracting(Course::getStatus)
        .isEqualTo(CourseStatus.DRAFT);
  }

  @Test
  @DisplayName("노드 필수 태그를 교체 저장한다")
  void updateRequiredTagsReplacesMappings() {
    Tag springBoot = saveTag("Spring Boot");
    Tag springSecurity = saveTag("Spring Security");
    RoadmapNode node = saveNode(saveOfficialRoadmap("Backend Roadmap"), "Security Node", "CONCEPT", 1);

    adminNodeGovernanceService.updateRequiredTags(
        node.getNodeId(), updateRequiredTagsRequest(List.of(springBoot.getTagId(), springSecurity.getTagId())));
    flushAndClear();

    assertThat(nodeRequiredTagRepository.findTagNamesByNodeId(node.getNodeId()))
        .containsExactly("Spring Boot", "Spring Security");
  }

  @Test
  @DisplayName("노드 타입을 변경한다")
  void updateNodeTypeChangesNodeType() {
    RoadmapNode node = saveNode(saveOfficialRoadmap("Node Type Roadmap"), "OAuth2", "CONCEPT", 2);

    adminNodeGovernanceService.updateNodeType(node.getNodeId(), updateNodeTypeRequest("project"));
    flushAndClear();

    assertThat(roadmapNodeRepository.findById(node.getNodeId())).get().extracting(RoadmapNode::getNodeType)
        .isEqualTo("PROJECT");
  }

  @Test
  @DisplayName("노드 선행조건을 교체 저장한다")
  void updatePrerequisitesReplacesMappings() {
    Roadmap roadmap = saveOfficialRoadmap("Prerequisite Roadmap");
    RoadmapNode targetNode = saveNode(roadmap, "Spring Security", "CONCEPT", 3);
    RoadmapNode prerequisiteOne = saveNode(roadmap, "Spring Boot", "CONCEPT", 1);
    RoadmapNode prerequisiteTwo = saveNode(roadmap, "JPA", "CONCEPT", 2);

    adminNodeGovernanceService.updatePrerequisites(
        targetNode.getNodeId(),
        updatePrerequisitesRequest(List.of(prerequisiteOne.getNodeId(), prerequisiteTwo.getNodeId())));
    flushAndClear();

    List<Prerequisite> prerequisites =
        prerequisiteRepository.findAllByNode(roadmapNodeRepository.findById(targetNode.getNodeId()).orElseThrow());

    assertThat(prerequisites).hasSize(2);
    assertThat(prerequisites.stream().map(item -> item.getPreNode().getNodeId()).toList())
        .containsExactly(prerequisiteOne.getNodeId(), prerequisiteTwo.getNodeId());
  }

  @Test
  @DisplayName("노드 선행조건은 자기 자신, 중복, 다른 로드맵 노드를 허용하지 않는다")
  void updatePrerequisitesRejectsInvalidRequests() {
    Roadmap roadmap = saveOfficialRoadmap("Validation Roadmap");
    RoadmapNode targetNode = saveNode(roadmap, "Target", "CONCEPT", 2);
    RoadmapNode sameRoadmapNode = saveNode(roadmap, "Sibling", "CONCEPT", 1);
    RoadmapNode foreignNode =
        saveNode(saveOfficialRoadmap("Other Roadmap"), "Foreign", "CONCEPT", 1);

    assertInvalidInput(
        () ->
            adminNodeGovernanceService.updatePrerequisites(
                targetNode.getNodeId(),
                updatePrerequisitesRequest(List.of(targetNode.getNodeId()))));

    assertInvalidInput(
        () ->
            adminNodeGovernanceService.updatePrerequisites(
                targetNode.getNodeId(),
                updatePrerequisitesRequest(List.of(sameRoadmapNode.getNodeId(), sameRoadmapNode.getNodeId()))));

    assertInvalidInput(
        () ->
            adminNodeGovernanceService.updatePrerequisites(
                targetNode.getNodeId(),
                updatePrerequisitesRequest(List.of(foreignNode.getNodeId()))));
  }

  @Test
  @DisplayName("노드 완료 기준을 생성하고 수정한다")
  void updateCompletionRuleCreatesAndUpdatesRule() {
    RoadmapNode node = saveNode(saveOfficialRoadmap("Completion Rule Roadmap"), "JWT", "PRACTICE", 1);

    adminNodeGovernanceService.updateCompletionRule(
        node.getNodeId(), updateCompletionRuleRequest("tag_coverage", "100"));
    adminNodeGovernanceService.updateCompletionRule(
        node.getNodeId(), updateCompletionRuleRequest("quiz_pass", "80"));
    flushAndClear();

    NodeCompletionRule rule = nodeCompletionRuleRepository.findByNodeNodeId(node.getNodeId()).orElseThrow();
    assertThat(rule.getCriteriaType()).isEqualTo("QUIZ_PASS");
    assertThat(rule.getCriteriaValue()).isEqualTo("80");
  }

  @Test
  @DisplayName("강의-노드 매핑 후보를 커버리지와 함께 조회하고 매핑을 확정 저장한다")
  void getMappingCandidatesAndUpdateCourseNodeMapping() {
    User instructor = saveUser("mapping-admin@devpath.com", UserRole.ROLE_INSTRUCTOR);
    Tag springSecurity = saveTag("Spring Security");
    Tag jwt = saveTag("JWT");
    Tag oauth2 = saveTag("OAuth2");

    Course course = saveCourse(instructor, "Security Course", CourseStatus.DRAFT);
    courseTagMapRepository.save(
        CourseTagMap.builder().course(course).tag(springSecurity).proficiencyLevel(5).build());
    courseTagMapRepository.save(
        CourseTagMap.builder().course(course).tag(jwt).proficiencyLevel(5).build());

    Roadmap roadmap = saveOfficialRoadmap("Backend Spring Roadmap");
    RoadmapNode perfectNode = saveNode(roadmap, "Spring Security", "CONCEPT", 4);
    RoadmapNode partialNode = saveNode(roadmap, "OAuth2 Login", "PRACTICE", 5);
    saveRequiredTag(perfectNode, springSecurity);
    saveRequiredTag(perfectNode, jwt);
    saveRequiredTag(partialNode, springSecurity);
    saveRequiredTag(partialNode, oauth2);
    flushAndClear();

    MappingCandidatesResponse response = adminPolicyAndMappingService.getMappingCandidates();

    CourseMappingCandidateItem courseItem =
        response.getCourses().stream()
            .filter(item -> item.getCourseId().equals(course.getCourseId()))
            .findFirst()
            .orElseThrow();

    assertThat(courseItem.getCourseTags()).containsExactly("JWT", "Spring Security");
    assertThat(courseItem.getTotalCandidates()).isEqualTo(2);
    assertThat(courseItem.getCandidates()).hasSize(2);
    assertThat(courseItem.getCandidates().get(0).getNodeId()).isEqualTo(perfectNode.getNodeId());
    assertThat(courseItem.getCandidates().get(0).getCoveragePercent()).isEqualByComparingTo("100.0");
    assertThat(courseItem.getCandidates().get(1).getNodeId()).isEqualTo(partialNode.getNodeId());
    assertThat(courseItem.getCandidates().get(1).getMissingTags()).containsExactly("OAuth2");

    adminPolicyAndMappingService.updateCourseNodeMapping(
        course.getCourseId(),
        updateNodeMappingRequest(List.of(perfectNode.getNodeId(), partialNode.getNodeId())));
    flushAndClear();

    List<CourseNodeMapping> mappings = courseNodeMappingRepository.findAllByCourseCourseId(course.getCourseId());
    assertThat(mappings).hasSize(2);
    assertThat(mappings.stream().map(mapping -> mapping.getNode().getNodeId()).toList())
        .containsExactlyInAnyOrder(perfectNode.getNodeId(), partialNode.getNodeId());

    CourseMappingCandidateItem mappedCourseItem =
        adminPolicyAndMappingService.getMappingCandidates().getCourses().stream()
            .filter(item -> item.getCourseId().equals(course.getCourseId()))
            .findFirst()
            .orElseThrow();
    assertThat(mappedCourseItem.getMappedNodeIds())
        .containsExactlyInAnyOrder(perfectNode.getNodeId(), partialNode.getNodeId());
  }

  @Test
  @DisplayName("시스템 정책과 스트리밍 정책을 조회하고 수정한다")
  void getAndUpdateSystemPolicies() {
    SystemPolicyResponse defaultResponse = adminPolicyAndMappingService.getSystemPolicies();

    assertThat(defaultResponse.getPlatformFeeRate()).isEqualByComparingTo("15.0");
    assertThat(defaultResponse.getInstructorSettlementRate()).isEqualByComparingTo("85.0");
    assertThat(defaultResponse.getIsHlsEncrypted()).isTrue();
    assertThat(defaultResponse.getMaxConcurrentDevices()).isEqualTo(3);

    adminPolicyAndMappingService.updateSystemPolicies(updateSystemPolicyRequest(20.0, 80.0));
    adminPolicyAndMappingService.updateStreamingPolicy(updateStreamingPolicyRequest(false, 2));
    flushAndClear();

    SystemPolicyResponse updatedResponse = adminPolicyAndMappingService.getSystemPolicies();
    assertThat(updatedResponse.getPlatformFeeRate()).isEqualByComparingTo("20.0");
    assertThat(updatedResponse.getInstructorSettlementRate()).isEqualByComparingTo("80.0");
    assertThat(updatedResponse.getIsHlsEncrypted()).isFalse();
    assertThat(updatedResponse.getMaxConcurrentDevices()).isEqualTo(2);
    assertThat(systemSettingRepository.findTopByOrderBySettingIdAsc()).isPresent();
  }

  @Test
  @DisplayName("태그 병합 시 강의 태그, 사용자 기술스택, 노드 필수 태그를 모두 이전한다")
  void mergeTagsMovesAllReferences() {
    User instructor = saveUser("tag-merge-instructor@devpath.com", UserRole.ROLE_INSTRUCTOR);
    User learner = saveUser("tag-merge-learner@devpath.com", UserRole.ROLE_LEARNER);
    Course course = saveCourse(instructor, "Merge Target Course", CourseStatus.DRAFT);
    RoadmapNode node = saveNode(saveOfficialRoadmap("Merge Tag Roadmap"), "JWT Node", "CONCEPT", 1);

    Tag sourceTag = saveTag("spring-security-core");
    Tag targetTag = saveTag("spring-security");

    courseTagMapRepository.save(
        CourseTagMap.builder().course(course).tag(sourceTag).proficiencyLevel(5).build());
    userTechStackRepository.save(UserTechStack.builder().user(learner).tag(sourceTag).build());
    saveRequiredTag(node, sourceTag);
    flushAndClear();

    adminTagGovernanceService.mergeTags(mergeTagsRequest(sourceTag.getTagId(), targetTag.getTagId()));
    flushAndClear();

    assertThat(tagRepository.findById(sourceTag.getTagId())).isEmpty();
    assertThat(courseTagMapRepository.findAllByCourseCourseId(course.getCourseId()))
        .extracting(mapping -> mapping.getTag().getTagId())
        .containsExactly(targetTag.getTagId());
    assertThat(userTechStackRepository.findAll())
        .extracting(techStack -> techStack.getTag().getTagId())
        .contains(targetTag.getTagId());
    assertThat(nodeRequiredTagRepository.findAllByNodeId(node.getNodeId()))
        .extracting(item -> item.getTag().getTagId())
        .containsExactly(targetTag.getTagId());
  }

  private User saveUser(String email, UserRole role) {
    return userRepository.save(
        User.builder().email(email).password("encoded-password").name(email).role(role).build());
  }

  private Tag saveTag(String name) {
    return tagRepository.save(Tag.builder().name(name).category("backend").isOfficial(true).build());
  }

  private Course saveCourse(User instructor, String title, CourseStatus status) {
    return courseRepository.save(
        Course.builder()
            .instructor(instructor)
            .title(title)
            .subtitle(title + " subtitle")
            .status(status)
            .price(BigDecimal.valueOf(10000))
            .originalPrice(BigDecimal.valueOf(12000))
            .currency("KRW")
            .build());
  }

  private Roadmap saveOfficialRoadmap(String title) {
    return roadmapRepository.save(
        Roadmap.builder()
            .title(title)
            .description(title + " description")
            .isOfficial(true)
            .isPublic(true)
            .isDeleted(false)
            .build());
  }

  private RoadmapNode saveNode(Roadmap roadmap, String title, String nodeType, int sortOrder) {
    return roadmapNodeRepository.save(
        RoadmapNode.builder()
            .roadmap(roadmap)
            .title(title)
            .content(title + " content")
            .nodeType(nodeType)
            .sortOrder(sortOrder)
            .build());
  }

  private void saveRequiredTag(RoadmapNode node, Tag tag) {
    nodeRequiredTagRepository.save(NodeRequiredTag.builder().node(node).tag(tag).build());
  }

  private void flushAndClear() {
    entityManager.flush();
    entityManager.clear();
  }

  private void assertInvalidInput(Runnable action) {
    assertThatThrownBy(action::run)
        .isInstanceOf(CustomException.class)
        .extracting(throwable -> ((CustomException) throwable).getErrorCode())
        .isEqualTo(ErrorCode.INVALID_INPUT);
  }

  private UpdateRequiredTags updateRequiredTagsRequest(List<Long> tagIds) {
    UpdateRequiredTags request = newInstance(UpdateRequiredTags.class);
    ReflectionTestUtils.setField(request, "tagIds", tagIds);
    return request;
  }

  private UpdateNodeType updateNodeTypeRequest(String nodeType) {
    UpdateNodeType request = newInstance(UpdateNodeType.class);
    ReflectionTestUtils.setField(request, "nodeType", nodeType);
    return request;
  }

  private UpdatePrerequisites updatePrerequisitesRequest(List<Long> prerequisiteNodeIds) {
    UpdatePrerequisites request = newInstance(UpdatePrerequisites.class);
    ReflectionTestUtils.setField(request, "prerequisiteNodeIds", prerequisiteNodeIds);
    return request;
  }

  private UpdateCompletionRule updateCompletionRuleRequest(String criteriaType, String criteriaValue) {
    UpdateCompletionRule request = newInstance(UpdateCompletionRule.class);
    ReflectionTestUtils.setField(request, "criteriaType", criteriaType);
    ReflectionTestUtils.setField(request, "criteriaValue", criteriaValue);
    return request;
  }

  private UpdateNodeMapping updateNodeMappingRequest(List<Long> mappedNodeIds) {
    UpdateNodeMapping request = newInstance(UpdateNodeMapping.class);
    ReflectionTestUtils.setField(request, "mappedNodeIds", mappedNodeIds);
    return request;
  }

  private UpdateSystemPolicy updateSystemPolicyRequest(Double platformFeeRate, Double instructorSettlementRate) {
    UpdateSystemPolicy request = newInstance(UpdateSystemPolicy.class);
    ReflectionTestUtils.setField(request, "platformFeeRate", platformFeeRate);
    ReflectionTestUtils.setField(request, "instructorSettlementRate", instructorSettlementRate);
    return request;
  }

  private UpdateStreamingPolicy updateStreamingPolicyRequest(
      Boolean isHlsEncrypted, Integer maxConcurrentDevices) {
    UpdateStreamingPolicy request = newInstance(UpdateStreamingPolicy.class);
    ReflectionTestUtils.setField(request, "isHlsEncrypted", isHlsEncrypted);
    ReflectionTestUtils.setField(request, "maxConcurrentDevices", maxConcurrentDevices);
    return request;
  }

  private com.devpath.api.admin.dto.TagGovernanceRequests.MergeTags mergeTagsRequest(
      Long sourceTagId, Long targetTagId) {
    com.devpath.api.admin.dto.TagGovernanceRequests.MergeTags request =
        newInstance(com.devpath.api.admin.dto.TagGovernanceRequests.MergeTags.class);
    ReflectionTestUtils.setField(request, "sourceTagId", sourceTagId);
    ReflectionTestUtils.setField(request, "targetTagId", targetTagId);
    return request;
  }

  private <T> T newInstance(Class<T> type) {
    try {
      var constructor = type.getDeclaredConstructor();
      constructor.setAccessible(true);
      return constructor.newInstance();
    } catch (ReflectiveOperationException e) {
      throw new IllegalStateException("Failed to create test request instance: " + type.getName(), e);
    }
  }
}
