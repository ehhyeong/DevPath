package com.devpath.api.home.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.devpath.api.course.dto.LectureCatalogMenuResponse;
import com.devpath.api.course.service.LectureCatalogQueryService;
import com.devpath.api.home.dto.AuthenticatedHomeDto;
import com.devpath.api.workspace.dto.WorkspaceHubProjectResponse;
import com.devpath.api.workspace.service.WorkspaceHubProjectService;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseEnrollment;
import com.devpath.domain.course.entity.CourseSection;
import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.entity.CourseTagMap;
import com.devpath.domain.course.entity.EnrollmentStatus;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.repository.CourseEnrollmentRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseTagMapRepository;
import com.devpath.domain.learning.entity.LessonProgress;
import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.review.repository.ReviewRepository;
import com.devpath.domain.user.entity.Tag;
import com.devpath.domain.user.entity.User;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class AuthenticatedHomeServiceTest {

  @Mock private LessonProgressRepository lessonProgressRepository;
  @Mock private CourseEnrollmentRepository courseEnrollmentRepository;
  @Mock private CourseRepository courseRepository;
  @Mock private CourseTagMapRepository courseTagMapRepository;
  @Mock private ReviewRepository reviewRepository;
  @Mock private WorkspaceHubProjectService workspaceHubProjectService;
  @Mock private LectureCatalogQueryService lectureCatalogQueryService;

  private AuthenticatedHomeService service;

  @BeforeEach
  void setUp() {
    service =
        new AuthenticatedHomeService(
            lessonProgressRepository,
            courseEnrollmentRepository,
            courseRepository,
            courseTagMapRepository,
            reviewRepository,
            workspaceHubProjectService,
            lectureCatalogQueryService);
  }

  @Test
  void getDashboardUsesTheUsersLatestLearningProjectsAndRankedCourses() {
    long userId = 7L;
    Course springCourse = course(10L, "Spring 실전", 88000, LocalDateTime.now().minusDays(2));
    Course reactCourse = course(11L, "React 실전", 77000, LocalDateTime.now().minusDays(1));
    Lesson lesson = lesson(101L, "AOP 핵심", springCourse);
    LessonProgress progress = LessonProgress.builder().user(user()).lesson(lesson).build();
    CourseEnrollment enrollment =
        CourseEnrollment.builder()
            .user(user())
            .course(springCourse)
            .status(EnrollmentStatus.ACTIVE)
            .progressPercentage(65)
            .build();
    Tag java = Tag.builder().tagId(3L).name("Java").isDeleted(false).build();

    when(lessonProgressRepository.findRecentByUserIdWithLessonAndSection(
            org.mockito.ArgumentMatchers.eq(userId), any(Pageable.class)))
        .thenReturn(List.of(progress));
    when(courseEnrollmentRepository.findAllByUserIdWithCourse(userId))
        .thenReturn(List.of(enrollment));
    when(workspaceHubProjectService.getProjects(userId))
        .thenReturn(
            List.of(
                WorkspaceHubProjectResponse.builder()
                    .projectId(20L)
                    .type("squad")
                    .status("progress")
                    .title("DevPath")
                    .description("커리어 플랫폼")
                    .progressPercent(40)
                    .dashboardUrl("/squad-dashboard?workspaceId=20")
                    .build()));
    when(courseRepository.findByStatus(CourseStatus.PUBLISHED))
        .thenReturn(List.of(springCourse, reactCourse));
    when(courseEnrollmentRepository.countByCourseIds(List.of(10L, 11L)))
        .thenReturn(List.of(new Object[] {10L, 4L}, new Object[] {11L, 9L}));
    when(reviewRepository.findAverageRatingsByCourseIds(List.of(10L, 11L)))
        .thenReturn(List.of(new Object[] {10L, 4.9}, new Object[] {11L, 4.7}));
    when(courseTagMapRepository.findAllByCourseCourseIdInOrderByCourseAndTagName(List.of(10L, 11L)))
        .thenReturn(List.of(CourseTagMap.builder().course(springCourse).tag(java).build()));
    when(lectureCatalogQueryService.getPublicMenu()).thenReturn(catalogMenu());

    AuthenticatedHomeDto.DashboardResponse result = service.getDashboard(userId);

    assertThat(result.getCurrentLearning().getLessonTitle()).isEqualTo("AOP 핵심");
    assertThat(result.getCurrentLearning().getProgressPercentage()).isEqualTo(65);
    assertThat(result.getCurrentLearning().getHref())
        .isEqualTo("/learning?courseId=10&lessonId=101");
    assertThat(result.getParticipatingProjects())
        .extracting(AuthenticatedHomeDto.ProjectSummary::getTitle)
        .containsExactly("DevPath");
    assertThat(result.getRecentCourses())
        .extracting(AuthenticatedHomeDto.RecentCourse::getTitle)
        .containsExactly("Spring 실전");
    assertThat(result.getTopCourseCategories())
        .extracting("label")
        .containsExactly("전체", "개발", "AI", "데이터", "인프라", "모바일", "커리어");
    assertThat(result.getTopCourseCategories().getFirst().getCourses())
        .extracting(AuthenticatedHomeDto.TopCourse::getTitle)
        .containsExactly("React 실전", "Spring 실전");
    assertThat(result.getTopCourseCategories().get(1).getCourses())
        .extracting(AuthenticatedHomeDto.TopCourse::getTitle)
        .containsExactly("React 실전", "Spring 실전");
  }

  @Test
  void getDashboardReturnsEmptySectionsInsteadOfSampleData() {
    when(lessonProgressRepository.findRecentByUserIdWithLessonAndSection(
            org.mockito.ArgumentMatchers.eq(7L), any(Pageable.class)))
        .thenReturn(List.of());
    when(courseEnrollmentRepository.findAllByUserIdWithCourse(7L)).thenReturn(List.of());
    when(workspaceHubProjectService.getProjects(7L)).thenReturn(List.of());
    when(courseRepository.findByStatus(CourseStatus.PUBLISHED)).thenReturn(List.of());

    AuthenticatedHomeDto.DashboardResponse result = service.getDashboard(7L);

    assertThat(result.getCurrentLearning()).isNull();
    assertThat(result.getParticipatingProjects()).isEmpty();
    assertThat(result.getRecentCourses()).isEmpty();
    assertThat(result.getTopCourseCategories()).isEmpty();
  }

  private Course course(Long id, String title, int price, LocalDateTime publishedAt) {
    return Course.builder()
        .courseId(id)
        .title(title)
        .price(BigDecimal.valueOf(price))
        .currency("KRW")
        .status(CourseStatus.PUBLISHED)
        .publishedAt(publishedAt)
        .build();
  }

  private Lesson lesson(Long id, String title, Course course) {
    CourseSection section =
        CourseSection.builder().sectionId(id + 1).course(course).title("섹션").build();
    return Lesson.builder().lessonId(id).section(section).title(title).build();
  }

  private User user() {
    return User.builder().email("learner@example.com").password("pw").name("학습자").build();
  }

  private LectureCatalogMenuResponse catalogMenu() {
    return LectureCatalogMenuResponse.builder()
        .categories(
            List.of(
                category("all", "전체", 0, List.of()),
                category("dev", "개발", 1, List.of("Java", "React", "Spring Boot")),
                category("ai", "AI", 2, List.of("머신러닝", "LLM")),
                category("data", "데이터", 3, List.of("SQL", "Pandas")),
                category("infra", "인프라", 4, List.of("Docker", "Kubernetes")),
                category("mobile", "모바일", 5, List.of("Android", "Flutter")),
                category("career", "커리어", 6, List.of("이력서", "면접"))))
        .build();
  }

  private LectureCatalogMenuResponse.CategoryItem category(
      String key, String label, int sortOrder, List<String> keywords) {
    List<LectureCatalogMenuResponse.GroupTagItem> items =
        keywords.stream()
            .map(
                keyword ->
                    LectureCatalogMenuResponse.GroupTagItem.builder()
                        .name(keyword)
                        .sortOrder(0)
                        .build())
            .toList();
    List<LectureCatalogMenuResponse.GroupItem> groups =
        items.isEmpty()
            ? List.of()
            : List.of(
                LectureCatalogMenuResponse.GroupItem.builder()
                    .name("분류")
                    .sortOrder(0)
                    .items(items)
                    .build());

    return LectureCatalogMenuResponse.CategoryItem.builder()
        .categoryKey(key)
        .label(label)
        .title(label)
        .sortOrder(sortOrder)
        .active(true)
        .groups(groups)
        .build();
  }
}
