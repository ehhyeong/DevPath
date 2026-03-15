package com.devpath.api.instructor.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devpath.api.common.dto.CourseDetailResponse;
import com.devpath.api.instructor.dto.InstructorCourseDto;
import com.devpath.api.instructor.dto.InstructorLessonDto;
import com.devpath.api.instructor.dto.InstructorMaterialDto;
import com.devpath.api.instructor.dto.InstructorSectionDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.repository.CourseMaterialRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseSectionRepository;
import com.devpath.domain.course.repository.CourseTagMapRepository;
import com.devpath.domain.course.repository.LessonPrerequisiteRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.user.entity.Tag;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.entity.UserTechStack;
import com.devpath.domain.user.repository.TagRepository;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.util.ReflectionTestUtils;

// 강사용 강의 서비스의 전체 라이프사이클을 통합 검증한다.
@DataJpaTest(
    properties = {
      "spring.jpa.hibernate.ddl-auto=create-drop",
      "spring.sql.init.mode=never",
      "spring.jpa.defer-datasource-initialization=false"
    })
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Import({InstructorCourseService.class, InstructorCourseQueryService.class})
class InstructorCourseServiceIntegrationTest {

  @Autowired private InstructorCourseService instructorCourseService;
  @Autowired private InstructorCourseQueryService instructorCourseQueryService;

  @Autowired private UserRepository userRepository;
  @Autowired private UserProfileRepository userProfileRepository;
  @Autowired private UserTechStackRepository userTechStackRepository;
  @Autowired private TagRepository tagRepository;

  @Autowired private CourseRepository courseRepository;
  @Autowired private CourseSectionRepository courseSectionRepository;
  @Autowired private LessonRepository lessonRepository;
  @Autowired private LessonPrerequisiteRepository lessonPrerequisiteRepository;
  @Autowired private CourseMaterialRepository courseMaterialRepository;
  @Autowired private CourseTagMapRepository courseTagMapRepository;

  @Autowired private EntityManager entityManager;

  private Long instructorId;
  private Long javaTagId;
  private Long springBootTagId;
  private Long jpaTagId;
  private Long springSecurityTagId;

  @BeforeEach
  void setUp() {
    User instructor =
        userRepository.save(
            User.builder()
                .email("instructor-test@devpath.com")
                .password("encoded-password")
                .name("Instructor Test")
                .role(UserRole.ROLE_INSTRUCTOR)
                .build());

    instructorId = instructor.getId();

    userProfileRepository.save(
        UserProfile.builder()
            .user(instructor)
            .profileImage("/images/profiles/test-instructor.png")
            .channelName("Test Backend Lab")
            .bio("강사용 강의 테스트 프로필")
            .phone("010-1234-5678")
            .githubUrl("https://github.com/test-instructor")
            .blogUrl("https://blog.devpath.test/instructor")
            .build());

    Tag javaTag =
        tagRepository.save(
            Tag.builder().name("Java").category("Backend").isOfficial(true).build());
    Tag springBootTag =
        tagRepository.save(
            Tag.builder().name("Spring Boot").category("Backend").isOfficial(true).build());
    Tag jpaTag =
        tagRepository.save(
            Tag.builder().name("JPA").category("Backend").isOfficial(true).build());
    Tag springSecurityTag =
        tagRepository.save(
            Tag.builder().name("Spring Security").category("Backend").isOfficial(true).build());

    javaTagId = javaTag.getTagId();
    springBootTagId = springBootTag.getTagId();
    jpaTagId = jpaTag.getTagId();
    springSecurityTagId = springSecurityTag.getTagId();

    userTechStackRepository.save(UserTechStack.builder().user(instructor).tag(javaTag).build());
    userTechStackRepository.save(
        UserTechStack.builder().user(instructor).tag(springBootTag).build());

    flushAndClear();
  }

  // 강사용 강의 생성부터 삭제까지 전체 흐름을 순서대로 검증한다.
  @Test
  @DisplayName("강사용 강의 전체 라이프사이클 통합 테스트")
  void instructorCourseLifecycleIntegrationTest() {
    Long courseId = instructorCourseService.createCourse(instructorId, createCourseRequest());
    flushAndClear();

    assertThat(courseRepository.findById(courseId)).isPresent();
    assertThat(courseTagMapRepository.findAllByCourseCourseId(courseId)).hasSize(2);

    instructorCourseService.updateCourse(instructorId, courseId, updateCourseRequest());
    instructorCourseService.updateCourseStatus(
        instructorId, courseId, updateStatusRequest("published"));
    flushAndClear();

    assertThat(courseRepository.findById(courseId))
        .hasValueSatisfying(
            course -> {
              assertThat(course.getTitle()).isEqualTo("Spring Security 실전");
              assertThat(course.getSubtitle()).isEqualTo("실무 인증/인가 구현");
              assertThat(course.getPrice()).isEqualByComparingTo("79000");
              assertThat(course.getStatus().name()).isEqualTo("PUBLISHED");
              assertThat(course.getPublishedAt()).isNotNull();
            });

    Long sectionId =
        instructorCourseService.createSection(instructorId, courseId, createSectionRequest());
    flushAndClear();

    assertThat(courseSectionRepository.findAllByCourseCourseIdOrderByOrderIndexAsc(courseId))
        .hasSize(1)
        .extracting("title")
        .containsExactly("Section 1. Spring Security 핵심");

    Long lessonId1 =
        instructorCourseService.createLesson(instructorId, sectionId, createLessonRequest1());
    Long lessonId2 =
        instructorCourseService.createLesson(instructorId, sectionId, createLessonRequest2());
    flushAndClear();

    assertThat(lessonRepository.findAllBySectionSectionIdOrderByOrderIndexAsc(sectionId))
        .hasSize(2)
        .extracting("title")
        .containsExactly("JWT 인증 필터 구현", "SecurityContext 저장 흐름");

    // 동일 섹션 내 레슨 2개의 순서를 서로 교체한다.
    instructorCourseService.updateLessonOrder(
        instructorId, updateLessonOrderRequest(sectionId, lessonId1, lessonId2));
    flushAndClear();

    assertThat(lessonRepository.findAllBySectionSectionIdOrderByOrderIndexAsc(sectionId))
        .extracting("lessonId")
        .containsExactly(lessonId2, lessonId1);

    instructorCourseService.updateCourseMetadata(instructorId, courseId, updateMetadataRequest());
    flushAndClear();

    assertThat(courseTagMapRepository.findAllByCourseCourseId(courseId)).hasSize(2);

    instructorCourseService.replaceObjectives(instructorId, courseId, replaceObjectivesRequest());
    instructorCourseService.replaceTargetAudiences(
        instructorId, courseId, replaceTargetAudiencesRequest());
    flushAndClear();

    instructorCourseService.uploadThumbnail(instructorId, courseId, uploadThumbnailRequest());
    instructorCourseService.uploadTrailer(instructorId, courseId, uploadTrailerRequest());

    Long materialId =
        instructorCourseService.createMaterial(instructorId, lessonId1, createMaterialRequest());
    flushAndClear();

    assertThat(courseMaterialRepository.findById(materialId)).isPresent();

    CourseDetailResponse detail = instructorCourseQueryService.getCourseDetail(instructorId, courseId);

    assertThat(detail.getCourseId()).isEqualTo(courseId);
    assertThat(detail.getTitle()).isEqualTo("Spring Security 실전");
    assertThat(detail.getStatus()).isEqualTo("PUBLISHED");
    assertThat(detail.getPrerequisites()).containsExactly("Java 기본 문법", "HTTP 기초");
    assertThat(detail.getJobRelevance()).containsExactly("백엔드 개발자", "서버 엔지니어");
    assertThat(detail.getObjectives()).hasSize(2);
    assertThat(detail.getObjectives())
        .extracting(CourseDetailResponse.ObjectiveItem::getObjectiveText)
        .containsExactly("JWT 인증 구조를 이해한다.", "Spring Security 필터 체인을 설명할 수 있다.");
    assertThat(detail.getTargetAudiences()).hasSize(2);
    assertThat(detail.getTargetAudiences())
        .extracting(CourseDetailResponse.TargetAudienceItem::getAudienceDescription)
        .containsExactly("백엔드 취업 준비생", "Spring Security 입문자");
    assertThat(detail.getTags())
        .extracting(CourseDetailResponse.TagItem::getTagName)
        .containsExactlyInAnyOrder("JPA", "Spring Security");
    assertThat(detail.getThumbnailUrl()).isEqualTo("https://cdn.devpath.com/courses/thumb.png");
    assertThat(detail.getIntroVideoUrl()).isEqualTo("https://cdn.devpath.com/courses/trailer.mp4");
    assertThat(detail.getVideoAssetKey()).isEqualTo("courses/trailers/course-1.mp4");
    assertThat(detail.getDurationSeconds()).isEqualTo(95);
    assertThat(detail.getInstructor()).isNotNull();
    assertThat(detail.getInstructor().getChannelName()).isEqualTo("Test Backend Lab");
    assertThat(detail.getInstructor().getProfileImage())
        .isEqualTo("/images/profiles/test-instructor.png");
    assertThat(detail.getInstructor().getSpecialties()).containsExactlyInAnyOrder("Java", "Spring Boot");
    assertThat(detail.getNews()).isEmpty();
    assertThat(detail.getSections()).hasSize(1);
    assertThat(detail.getSections().get(0).getLessons()).hasSize(2);

    assertThat(detail.getSections().get(0).getLessons().get(0).getLessonId()).isEqualTo(lessonId2);
    assertThat(detail.getSections().get(0).getLessons().get(1).getLessonId()).isEqualTo(lessonId1);

    CourseDetailResponse.LessonItem lessonWithMaterial =
        detail.getSections().get(0).getLessons().stream()
            .filter(lesson -> lesson.getLessonId().equals(lessonId1))
            .findFirst()
            .orElseThrow();

    assertThat(lessonWithMaterial.getMaterials()).hasSize(1);
    assertThat(lessonWithMaterial.getMaterials().get(0).getOriginalFileName())
        .isEqualTo("week1-slide.pdf");

    instructorCourseService.deleteCourse(instructorId, courseId);
    flushAndClear();

    assertThat(courseRepository.findById(courseId)).isEmpty();
    assertThat(courseSectionRepository.findAllByCourseCourseIdOrderByOrderIndexAsc(courseId)).isEmpty();
    assertThat(lessonRepository.findAllBySectionSectionIdOrderByOrderIndexAsc(sectionId)).isEmpty();
    assertThat(courseMaterialRepository.findAllByLessonLessonIdOrderByDisplayOrderAsc(lessonId1))
        .isEmpty();
    assertThat(courseTagMapRepository.findAllByCourseCourseId(courseId)).isEmpty();
  }

  @Test
  @DisplayName("레슨 선행 조건을 저장하고 레슨 삭제 시 함께 정리한다")
  void updateLessonPrerequisitesAndCleanupOnLessonDelete() {
    Long courseId = instructorCourseService.createCourse(instructorId, createCourseRequest());
    Long sectionId =
        instructorCourseService.createSection(instructorId, courseId, createSectionRequest());

    Long lessonId1 =
        instructorCourseService.createLesson(instructorId, sectionId, createLessonRequest1());
    Long lessonId2 =
        instructorCourseService.createLesson(instructorId, sectionId, createLessonRequest2());
    Long lessonId3 =
        instructorCourseService.createLesson(instructorId, sectionId, createLessonRequest3());

    instructorCourseService.updateLessonPrerequisites(
        instructorId, lessonId3, updateLessonPrerequisitesRequest(List.of(lessonId1, lessonId2)));
    flushAndClear();

    assertThat(
            lessonPrerequisiteRepository.findAllByLessonLessonIdOrderByLessonPrerequisiteIdAsc(
                lessonId3))
        .extracting(link -> link.getPrerequisiteLesson().getLessonId())
        .containsExactly(lessonId1, lessonId2);

    instructorCourseService.deleteLesson(instructorId, lessonId1);
    flushAndClear();

    assertThat(
            lessonPrerequisiteRepository.findAllByLessonLessonIdOrderByLessonPrerequisiteIdAsc(
                lessonId3))
        .extracting(link -> link.getPrerequisiteLesson().getLessonId())
        .containsExactly(lessonId2);
  }

  @Test
  @DisplayName("레슨 선행 조건은 자기 자신, 중복, 다른 강의 레슨을 허용하지 않는다")
  void updateLessonPrerequisitesRejectsInvalidCases() {
    Long courseId = instructorCourseService.createCourse(instructorId, createCourseRequest());
    Long sectionId =
        instructorCourseService.createSection(instructorId, courseId, createSectionRequest());

    Long lessonId1 =
        instructorCourseService.createLesson(instructorId, sectionId, createLessonRequest1());
    Long lessonId2 =
        instructorCourseService.createLesson(instructorId, sectionId, createLessonRequest2());
    Long lessonId3 =
        instructorCourseService.createLesson(instructorId, sectionId, createLessonRequest3());

    Long otherCourseId =
        instructorCourseService.createCourse(instructorId, createSecondCourseRequest());
    Long otherSectionId =
        instructorCourseService.createSection(instructorId, otherCourseId, createSecondSectionRequest());
    Long otherLessonId =
        instructorCourseService.createLesson(
            instructorId, otherSectionId, createOtherCourseLessonRequest());

    assertThatThrownBy(
            () ->
                instructorCourseService.updateLessonPrerequisites(
                    instructorId,
                    lessonId3,
                    updateLessonPrerequisitesRequest(List.of(lessonId1, lessonId1))))
        .isInstanceOf(CustomException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.INVALID_INPUT);

    assertThatThrownBy(
            () ->
                instructorCourseService.updateLessonPrerequisites(
                    instructorId,
                    lessonId3,
                    updateLessonPrerequisitesRequest(List.of(lessonId3))))
        .isInstanceOf(CustomException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.INVALID_INPUT);

    assertThatThrownBy(
            () ->
                instructorCourseService.updateLessonPrerequisites(
                    instructorId,
                    lessonId3,
                    updateLessonPrerequisitesRequest(List.of(lessonId2, otherLessonId))))
        .isInstanceOf(CustomException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.INVALID_INPUT);
  }

  private InstructorCourseDto.CreateCourseRequest createCourseRequest() {
    InstructorCourseDto.CreateCourseRequest request = new InstructorCourseDto.CreateCourseRequest();
    ReflectionTestUtils.setField(request, "title", "Spring Security 완전 정복");
    ReflectionTestUtils.setField(request, "subtitle", "JWT, OAuth2, Security 실전");
    ReflectionTestUtils.setField(request, "description", "보안 강의 생성 테스트");
    ReflectionTestUtils.setField(request, "price", new BigDecimal("99000"));
    ReflectionTestUtils.setField(request, "originalPrice", new BigDecimal("129000"));
    ReflectionTestUtils.setField(request, "currency", "KRW");
    ReflectionTestUtils.setField(request, "difficultyLevel", "beginner");
    ReflectionTestUtils.setField(request, "language", "ko");
    ReflectionTestUtils.setField(request, "hasCertificate", true);
    ReflectionTestUtils.setField(request, "tagIds", List.of(javaTagId, springBootTagId));
    return request;
  }

  private InstructorCourseDto.UpdateCourseRequest updateCourseRequest() {
    InstructorCourseDto.UpdateCourseRequest request = new InstructorCourseDto.UpdateCourseRequest();
    ReflectionTestUtils.setField(request, "title", "Spring Security 실전");
    ReflectionTestUtils.setField(request, "subtitle", "실무 인증/인가 구현");
    ReflectionTestUtils.setField(request, "description", "강의 수정 테스트");
    ReflectionTestUtils.setField(request, "price", new BigDecimal("79000"));
    ReflectionTestUtils.setField(request, "originalPrice", new BigDecimal("99000"));
    ReflectionTestUtils.setField(request, "currency", "KRW");
    ReflectionTestUtils.setField(request, "difficultyLevel", "intermediate");
    ReflectionTestUtils.setField(request, "language", "ko");
    ReflectionTestUtils.setField(request, "hasCertificate", true);
    return request;
  }

  private InstructorCourseDto.UpdateStatusRequest updateStatusRequest(String status) {
    InstructorCourseDto.UpdateStatusRequest request = new InstructorCourseDto.UpdateStatusRequest();
    ReflectionTestUtils.setField(request, "status", status);
    return request;
  }

  private InstructorSectionDto.CreateSectionRequest createSectionRequest() {
    InstructorSectionDto.CreateSectionRequest request = new InstructorSectionDto.CreateSectionRequest();
    ReflectionTestUtils.setField(request, "title", "Section 1. Spring Security 핵심");
    ReflectionTestUtils.setField(request, "description", "인증과 인가, 필터 체인을 학습한다.");
    ReflectionTestUtils.setField(request, "orderIndex", 1);
    ReflectionTestUtils.setField(request, "isPublished", true);
    return request;
  }

  private InstructorLessonDto.CreateLessonRequest createLessonRequest1() {
    InstructorLessonDto.CreateLessonRequest request = new InstructorLessonDto.CreateLessonRequest();
    ReflectionTestUtils.setField(request, "title", "JWT 인증 필터 구현");
    ReflectionTestUtils.setField(request, "description", "JWT 인증 필터를 구현한다.");
    ReflectionTestUtils.setField(request, "lessonType", "video");
    ReflectionTestUtils.setField(request, "videoId", "video-asset-001");
    ReflectionTestUtils.setField(request, "videoUrl", "https://cdn.devpath.com/lessons/video-1.mp4");
    ReflectionTestUtils.setField(request, "videoProvider", "r2");
    ReflectionTestUtils.setField(
        request, "thumbnailUrl", "https://cdn.devpath.com/lessons/thumbnails/video-1.png");
    ReflectionTestUtils.setField(request, "durationSeconds", 780);
    ReflectionTestUtils.setField(request, "orderIndex", 1);
    ReflectionTestUtils.setField(request, "isPreview", false);
    ReflectionTestUtils.setField(request, "isPublished", true);
    return request;
  }

  private InstructorLessonDto.CreateLessonRequest createLessonRequest2() {
    InstructorLessonDto.CreateLessonRequest request = new InstructorLessonDto.CreateLessonRequest();
    ReflectionTestUtils.setField(request, "title", "SecurityContext 저장 흐름");
    ReflectionTestUtils.setField(request, "description", "인증 객체 저장 흐름을 학습한다.");
    ReflectionTestUtils.setField(request, "lessonType", "video");
    ReflectionTestUtils.setField(request, "videoId", "video-asset-002");
    ReflectionTestUtils.setField(request, "videoUrl", "https://cdn.devpath.com/lessons/video-2.mp4");
    ReflectionTestUtils.setField(request, "videoProvider", "r2");
    ReflectionTestUtils.setField(
        request, "thumbnailUrl", "https://cdn.devpath.com/lessons/thumbnails/video-2.png");
    ReflectionTestUtils.setField(request, "durationSeconds", 840);
    ReflectionTestUtils.setField(request, "orderIndex", 2);
    ReflectionTestUtils.setField(request, "isPreview", true);
    ReflectionTestUtils.setField(request, "isPublished", true);
    return request;
  }

  private InstructorLessonDto.CreateLessonRequest createLessonRequest3() {
    InstructorLessonDto.CreateLessonRequest request = new InstructorLessonDto.CreateLessonRequest();
    ReflectionTestUtils.setField(request, "title", "Lesson prerequisite setup");
    ReflectionTestUtils.setField(
        request,
        "description",
        "Creates a third lesson that receives prerequisite links during the test.");
    ReflectionTestUtils.setField(request, "lessonType", "video");
    ReflectionTestUtils.setField(request, "videoId", "video-asset-003");
    ReflectionTestUtils.setField(request, "videoUrl", "https://cdn.devpath.com/lessons/video-3.mp4");
    ReflectionTestUtils.setField(request, "videoProvider", "r2");
    ReflectionTestUtils.setField(
        request, "thumbnailUrl", "https://cdn.devpath.com/lessons/thumbnails/video-3.png");
    ReflectionTestUtils.setField(request, "durationSeconds", 600);
    ReflectionTestUtils.setField(request, "orderIndex", 3);
    ReflectionTestUtils.setField(request, "isPreview", false);
    ReflectionTestUtils.setField(request, "isPublished", true);
    return request;
  }

  private InstructorCourseDto.CreateCourseRequest createSecondCourseRequest() {
    InstructorCourseDto.CreateCourseRequest request = new InstructorCourseDto.CreateCourseRequest();
    ReflectionTestUtils.setField(request, "title", "Second backend course");
    ReflectionTestUtils.setField(request, "subtitle", "Used to validate cross-course prerequisites");
    ReflectionTestUtils.setField(
        request,
        "description",
        "Creates a different course so prerequisite validation can reject foreign lessons.");
    ReflectionTestUtils.setField(request, "price", new BigDecimal("49000"));
    ReflectionTestUtils.setField(request, "originalPrice", new BigDecimal("59000"));
    ReflectionTestUtils.setField(request, "currency", "KRW");
    ReflectionTestUtils.setField(request, "difficultyLevel", "beginner");
    ReflectionTestUtils.setField(request, "language", "ko");
    ReflectionTestUtils.setField(request, "hasCertificate", false);
    ReflectionTestUtils.setField(request, "tagIds", List.of(javaTagId, jpaTagId));
    return request;
  }

  private InstructorSectionDto.CreateSectionRequest createSecondSectionRequest() {
    InstructorSectionDto.CreateSectionRequest request = new InstructorSectionDto.CreateSectionRequest();
    ReflectionTestUtils.setField(request, "title", "Section 1. Other course");
    ReflectionTestUtils.setField(request, "description", "Section used for foreign lesson validation.");
    ReflectionTestUtils.setField(request, "orderIndex", 1);
    ReflectionTestUtils.setField(request, "isPublished", true);
    return request;
  }

  private InstructorLessonDto.CreateLessonRequest createOtherCourseLessonRequest() {
    InstructorLessonDto.CreateLessonRequest request = new InstructorLessonDto.CreateLessonRequest();
    ReflectionTestUtils.setField(request, "title", "Other course lesson");
    ReflectionTestUtils.setField(request, "description", "Lesson that belongs to a different course.");
    ReflectionTestUtils.setField(request, "lessonType", "video");
    ReflectionTestUtils.setField(request, "videoId", "video-asset-004");
    ReflectionTestUtils.setField(request, "videoUrl", "https://cdn.devpath.com/lessons/video-4.mp4");
    ReflectionTestUtils.setField(request, "videoProvider", "r2");
    ReflectionTestUtils.setField(
        request, "thumbnailUrl", "https://cdn.devpath.com/lessons/thumbnails/video-4.png");
    ReflectionTestUtils.setField(request, "durationSeconds", 420);
    ReflectionTestUtils.setField(request, "orderIndex", 1);
    ReflectionTestUtils.setField(request, "isPreview", false);
    ReflectionTestUtils.setField(request, "isPublished", true);
    return request;
  }

  private InstructorLessonDto.UpdateLessonPrerequisitesRequest updateLessonPrerequisitesRequest(
      List<Long> prerequisiteLessonIds) {
    InstructorLessonDto.UpdateLessonPrerequisitesRequest request =
        new InstructorLessonDto.UpdateLessonPrerequisitesRequest();
    ReflectionTestUtils.setField(request, "prerequisiteLessonIds", prerequisiteLessonIds);
    return request;
  }

  private InstructorLessonDto.UpdateLessonOrderRequest updateLessonOrderRequest(
      Long sectionId, Long lessonId1, Long lessonId2) {
    InstructorLessonDto.LessonOrderItem first = new InstructorLessonDto.LessonOrderItem();
    ReflectionTestUtils.setField(first, "lessonId", lessonId1);
    ReflectionTestUtils.setField(first, "orderIndex", 2);

    InstructorLessonDto.LessonOrderItem second = new InstructorLessonDto.LessonOrderItem();
    ReflectionTestUtils.setField(second, "lessonId", lessonId2);
    ReflectionTestUtils.setField(second, "orderIndex", 1);

    InstructorLessonDto.UpdateLessonOrderRequest request =
        new InstructorLessonDto.UpdateLessonOrderRequest();
    ReflectionTestUtils.setField(request, "sectionId", sectionId);
    ReflectionTestUtils.setField(request, "lessonOrders", List.of(first, second));
    return request;
  }

  private InstructorCourseDto.UpdateMetadataRequest updateMetadataRequest() {
    InstructorCourseDto.UpdateMetadataRequest request = new InstructorCourseDto.UpdateMetadataRequest();
    ReflectionTestUtils.setField(request, "prerequisites", List.of("Java 기본 문법", "HTTP 기초"));
    ReflectionTestUtils.setField(request, "jobRelevance", List.of("백엔드 개발자", "서버 엔지니어"));
    ReflectionTestUtils.setField(request, "tagIds", List.of(jpaTagId, springSecurityTagId));
    return request;
  }

  private InstructorCourseDto.ReplaceObjectivesRequest replaceObjectivesRequest() {
    InstructorCourseDto.ReplaceObjectivesRequest request =
        new InstructorCourseDto.ReplaceObjectivesRequest();
    ReflectionTestUtils.setField(
        request,
        "objectives",
        List.of("JWT 인증 구조를 이해한다.", "Spring Security 필터 체인을 설명할 수 있다."));
    return request;
  }

  private InstructorCourseDto.ReplaceTargetAudiencesRequest replaceTargetAudiencesRequest() {
    InstructorCourseDto.ReplaceTargetAudiencesRequest request =
        new InstructorCourseDto.ReplaceTargetAudiencesRequest();
    ReflectionTestUtils.setField(
        request, "targetAudiences", List.of("백엔드 취업 준비생", "Spring Security 입문자"));
    return request;
  }

  private InstructorCourseDto.UploadThumbnailRequest uploadThumbnailRequest() {
    InstructorCourseDto.UploadThumbnailRequest request = new InstructorCourseDto.UploadThumbnailRequest();
    ReflectionTestUtils.setField(request, "thumbnailUrl", "https://cdn.devpath.com/courses/thumb.png");
    ReflectionTestUtils.setField(request, "originalFileName", "thumb.png");
    return request;
  }

  private InstructorCourseDto.UploadTrailerRequest uploadTrailerRequest() {
    InstructorCourseDto.UploadTrailerRequest request = new InstructorCourseDto.UploadTrailerRequest();
    ReflectionTestUtils.setField(request, "trailerUrl", "https://cdn.devpath.com/courses/trailer.mp4");
    ReflectionTestUtils.setField(request, "videoAssetKey", "courses/trailers/course-1.mp4");
    ReflectionTestUtils.setField(request, "durationSeconds", 95);
    ReflectionTestUtils.setField(request, "originalFileName", "intro.mp4");
    return request;
  }

  private InstructorMaterialDto.CreateMaterialRequest createMaterialRequest() {
    InstructorMaterialDto.CreateMaterialRequest request = new InstructorMaterialDto.CreateMaterialRequest();
    ReflectionTestUtils.setField(request, "materialType", "SLIDE");
    ReflectionTestUtils.setField(
        request, "materialUrl", "https://cdn.devpath.com/materials/lesson-10-slide.pdf");
    ReflectionTestUtils.setField(request, "assetKey", "lesson/materials/10/week1-slide.pdf");
    ReflectionTestUtils.setField(request, "originalFileName", "week1-slide.pdf");
    ReflectionTestUtils.setField(request, "fileSize", 1048576);
    ReflectionTestUtils.setField(request, "displayOrder", 0);
    return request;
  }

  private void flushAndClear() {
    entityManager.flush();
    entityManager.clear();
  }
}
