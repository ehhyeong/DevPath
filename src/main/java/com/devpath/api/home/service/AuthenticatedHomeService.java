package com.devpath.api.home.service;

import com.devpath.api.course.dto.LectureCatalogMenuResponse;
import com.devpath.api.course.service.LectureCatalogQueryService;
import com.devpath.api.home.dto.AuthenticatedHomeDto;
import com.devpath.api.workspace.dto.WorkspaceHubProjectResponse;
import com.devpath.api.workspace.service.WorkspaceHubProjectService;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseEnrollment;
import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.entity.CourseTagMap;
import com.devpath.domain.course.entity.EnrollmentStatus;
import com.devpath.domain.course.repository.CourseEnrollmentRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseTagMapRepository;
import com.devpath.domain.learning.entity.LessonProgress;
import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.review.repository.ReviewRepository;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthenticatedHomeService {

  private static final int RECENT_PROGRESS_LIMIT = 50;
  private static final int HOME_LIST_LIMIT = 3;
  private static final int TOP_COURSE_LIMIT = 10;

  private final LessonProgressRepository lessonProgressRepository;
  private final CourseEnrollmentRepository courseEnrollmentRepository;
  private final CourseRepository courseRepository;
  private final CourseTagMapRepository courseTagMapRepository;
  private final ReviewRepository reviewRepository;
  private final WorkspaceHubProjectService workspaceHubProjectService;
  private final LectureCatalogQueryService lectureCatalogQueryService;

  public AuthenticatedHomeDto.DashboardResponse getDashboard(Long userId) {
    List<LessonProgress> recentProgresses =
        lessonProgressRepository.findRecentByUserIdWithLessonAndSection(
            userId, PageRequest.of(0, RECENT_PROGRESS_LIMIT));
    Map<Long, CourseEnrollment> enrollmentsByCourseId =
        courseEnrollmentRepository.findAllByUserIdWithCourse(userId).stream()
            .filter(enrollment -> enrollment.getStatus() != EnrollmentStatus.CANCELLED)
            .collect(
                Collectors.toMap(
                    enrollment -> enrollment.getCourse().getCourseId(),
                    Function.identity(),
                    (first, ignored) -> first));

    return AuthenticatedHomeDto.DashboardResponse.builder()
        .currentLearning(buildCurrentLearning(recentProgresses, enrollmentsByCourseId))
        .participatingProjects(buildParticipatingProjects(userId))
        .recentCourses(buildRecentCourses(recentProgresses, enrollmentsByCourseId))
        .topCourseCategories(buildTopCourseCategories())
        .build();
  }

  private AuthenticatedHomeDto.LearningStatus buildCurrentLearning(
      List<LessonProgress> recentProgresses, Map<Long, CourseEnrollment> enrollmentsByCourseId) {
    return recentProgresses.stream()
        .filter(progress -> enrollmentsByCourseId.containsKey(courseIdOf(progress)))
        .findFirst()
        .map(
            progress -> {
              Course course = courseOf(progress);
              CourseEnrollment enrollment = enrollmentsByCourseId.get(course.getCourseId());
              return AuthenticatedHomeDto.LearningStatus.builder()
                  .courseId(course.getCourseId())
                  .lessonId(progress.getLesson().getLessonId())
                  .courseTitle(course.getTitle())
                  .lessonTitle(progress.getLesson().getTitle())
                  .progressPercentage(normalizeProgress(enrollment.getProgressPercentage()))
                  .href(
                      "/learning?courseId="
                          + course.getCourseId()
                          + "&lessonId="
                          + progress.getLesson().getLessonId())
                  .lastWatchedAt(progress.getLastWatchedAt())
                  .build();
            })
        .orElse(null);
  }

  private List<AuthenticatedHomeDto.ProjectSummary> buildParticipatingProjects(Long userId) {
    return workspaceHubProjectService.getProjects(userId).stream()
        .filter(project -> "progress".equals(project.getStatus()))
        .limit(HOME_LIST_LIMIT)
        .map(
            project ->
                AuthenticatedHomeDto.ProjectSummary.builder()
                    .projectId(project.getProjectId())
                    .typeLabel(resolveProjectTypeLabel(project))
                    .title(project.getTitle())
                    .description(project.getDescription())
                    .progressPercentage(normalizeProgress(project.getProgressPercent()))
                    .href(project.getDashboardUrl())
                    .build())
        .toList();
  }

  private List<AuthenticatedHomeDto.RecentCourse> buildRecentCourses(
      List<LessonProgress> recentProgresses, Map<Long, CourseEnrollment> enrollmentsByCourseId) {
    Map<Long, LessonProgress> latestProgressByCourseId = new LinkedHashMap<>();
    for (LessonProgress progress : recentProgresses) {
      Long courseId = courseIdOf(progress);
      if (enrollmentsByCourseId.containsKey(courseId)) {
        latestProgressByCourseId.putIfAbsent(courseId, progress);
      }
    }

    return latestProgressByCourseId.values().stream()
        .limit(HOME_LIST_LIMIT)
        .map(
            progress -> {
              Course course = courseOf(progress);
              CourseEnrollment enrollment = enrollmentsByCourseId.get(course.getCourseId());
              return AuthenticatedHomeDto.RecentCourse.builder()
                  .courseId(course.getCourseId())
                  .title(course.getTitle())
                  .thumbnailUrl(course.getThumbnailUrl())
                  .progressPercentage(normalizeProgress(enrollment.getProgressPercentage()))
                  .href("/course-detail?courseId=" + course.getCourseId())
                  .lastWatchedAt(progress.getLastWatchedAt())
                  .build();
            })
        .toList();
  }

  private List<AuthenticatedHomeDto.CourseCategory> buildTopCourseCategories() {
    List<Course> publishedCourses = courseRepository.findByStatus(CourseStatus.PUBLISHED);
    if (publishedCourses.isEmpty()) {
      return List.of();
    }

    List<Long> courseIds = publishedCourses.stream().map(Course::getCourseId).toList();
    Map<Long, Long> enrollmentCounts =
        toLongMap(courseEnrollmentRepository.countByCourseIds(courseIds));
    Map<Long, Double> averageRatings =
        toDoubleMap(reviewRepository.findAverageRatingsByCourseIds(courseIds));
    Comparator<Course> ranking = rankingComparator(enrollmentCounts, averageRatings);
    List<Course> rankedCourses = publishedCourses.stream().sorted(ranking).toList();
    List<CourseTagMap> tagMaps =
        courseTagMapRepository.findAllByCourseCourseIdInOrderByCourseAndTagName(courseIds);

    Map<Long, List<String>> tagNamesByCourseId =
        tagMaps.stream()
            .filter(tagMap -> !Boolean.TRUE.equals(tagMap.getTag().getIsDeleted()))
            .collect(
                Collectors.groupingBy(
                    tagMap -> tagMap.getCourse().getCourseId(),
                    LinkedHashMap::new,
                    Collectors.mapping(tagMap -> tagMap.getTag().getName(), Collectors.toList())));

    List<LectureCatalogMenuResponse.CategoryItem> catalogCategories =
        lectureCatalogQueryService.getPublicMenu().getCategories();
    if (catalogCategories.isEmpty()) {
      return List.of();
    }

    String overviewCategoryKey =
        catalogCategories.stream()
            .map(LectureCatalogMenuResponse.CategoryItem::getCategoryKey)
            .filter("all"::equals)
            .findFirst()
            .orElse(catalogCategories.getFirst().getCategoryKey());
    Map<Long, String> categoryKeyByCourseId =
        rankedCourses.stream()
            .collect(
                Collectors.toMap(
                    Course::getCourseId,
                    course ->
                        inferCategoryKey(
                            course,
                            tagNamesByCourseId.getOrDefault(course.getCourseId(), List.of()),
                            catalogCategories,
                            overviewCategoryKey)));

    return catalogCategories.stream()
        .map(
            category -> {
              List<Course> courses =
                  category.getCategoryKey().equals(overviewCategoryKey)
                      ? rankedCourses
                      : rankedCourses.stream()
                          .filter(
                              course ->
                                  category
                                      .getCategoryKey()
                                      .equals(categoryKeyByCourseId.get(course.getCourseId())))
                          .toList();
              return AuthenticatedHomeDto.CourseCategory.builder()
                  .key(category.getCategoryKey())
                  .label(category.getLabel())
                  .courses(
                      mapTopCourses(courses, category.getLabel(), enrollmentCounts, averageRatings))
                  .build();
            })
        .toList();
  }

  private String inferCategoryKey(
      Course course,
      List<String> courseTags,
      List<LectureCatalogMenuResponse.CategoryItem> categories,
      String overviewCategoryKey) {
    String haystack = normalizeText(course.getTitle() + " " + String.join(" ", courseTags));
    String bestCategoryKey = overviewCategoryKey;
    int bestScore = 0;

    for (LectureCatalogMenuResponse.CategoryItem category : categories) {
      if (category.getCategoryKey().equals(overviewCategoryKey)) {
        continue;
      }

      int score =
          categoryKeywords(category).stream()
              .filter(keyword -> !keyword.isBlank() && haystack.contains(keyword))
              .mapToInt(keyword -> keyword.contains(" ") ? 3 : 2)
              .sum();
      if (score > bestScore) {
        bestScore = score;
        bestCategoryKey = category.getCategoryKey();
      }
    }

    return bestCategoryKey;
  }

  private Set<String> categoryKeywords(LectureCatalogMenuResponse.CategoryItem category) {
    Set<String> keywords = new LinkedHashSet<>();
    keywords.add(normalizeText(category.getLabel()));
    keywords.add(normalizeText(category.getTitle()));
    category.getMegaMenuItems().stream()
        .map(LectureCatalogMenuResponse.MegaMenuItem::getLabel)
        .map(this::normalizeText)
        .forEach(keywords::add);
    category
        .getGroups()
        .forEach(
            group -> {
              keywords.add(normalizeText(group.getName()));
              group.getItems().stream()
                  .map(LectureCatalogMenuResponse.GroupTagItem::getName)
                  .map(this::normalizeText)
                  .forEach(keywords::add);
            });
    keywords.remove("");
    return keywords;
  }

  private String normalizeText(String value) {
    return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
  }

  private List<AuthenticatedHomeDto.TopCourse> mapTopCourses(
      List<Course> courses,
      String categoryLabel,
      Map<Long, Long> enrollmentCounts,
      Map<Long, Double> averageRatings) {
    return courses.stream()
        .limit(TOP_COURSE_LIMIT)
        .map(
            course ->
                AuthenticatedHomeDto.TopCourse.builder()
                    .courseId(course.getCourseId())
                    .title(course.getTitle())
                    .thumbnailUrl(course.getThumbnailUrl())
                    .categoryLabel(categoryLabel)
                    .averageRating(averageRatings.get(course.getCourseId()))
                    .enrollmentCount(enrollmentCounts.getOrDefault(course.getCourseId(), 0L))
                    .price(course.getPrice())
                    .currency(course.getCurrency())
                    .href("/course-detail?courseId=" + course.getCourseId())
                    .build())
        .toList();
  }

  private Comparator<Course> rankingComparator(
      Map<Long, Long> enrollmentCounts, Map<Long, Double> averageRatings) {
    return Comparator.<Course>comparingLong(
            course -> enrollmentCounts.getOrDefault(course.getCourseId(), 0L))
        .reversed()
        .thenComparing(
            course -> averageRatings.getOrDefault(course.getCourseId(), 0.0),
            Comparator.reverseOrder())
        .thenComparing(Course::getPublishedAt, Comparator.nullsLast(Comparator.reverseOrder()))
        .thenComparing(Course::getCourseId, Comparator.reverseOrder());
  }

  private Map<Long, Long> toLongMap(List<Object[]> rows) {
    return rows.stream()
        .collect(
            Collectors.toMap(
                row -> ((Number) row[0]).longValue(), row -> ((Number) row[1]).longValue()));
  }

  private Map<Long, Double> toDoubleMap(List<Object[]> rows) {
    return rows.stream()
        .collect(
            Collectors.toMap(
                row -> ((Number) row[0]).longValue(), row -> ((Number) row[1]).doubleValue()));
  }

  private Course courseOf(LessonProgress progress) {
    return progress.getLesson().getSection().getCourse();
  }

  private Long courseIdOf(LessonProgress progress) {
    return courseOf(progress).getCourseId();
  }

  private int normalizeProgress(Integer progress) {
    if (progress == null) {
      return 0;
    }
    return Math.max(0, Math.min(progress, 100));
  }

  private String resolveProjectTypeLabel(WorkspaceHubProjectResponse project) {
    if ("mentoring".equals(project.getType())) {
      return project.getMentoringModeLabel() == null
          ? "멘토링"
          : "멘토링 · " + project.getMentoringModeLabel().replace("형", "");
    }
    if ("solo".equals(project.getType())) {
      return "개인 프로젝트";
    }
    return "스쿼드";
  }
}
