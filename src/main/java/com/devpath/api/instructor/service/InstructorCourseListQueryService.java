package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.course.InstructorCourseListResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseEnrollment;
import com.devpath.domain.course.entity.CourseTagMap;
import com.devpath.domain.course.entity.EnrollmentStatus;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.repository.CourseEnrollmentRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseTagMapRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.qna.repository.QuestionRepository;
import com.devpath.domain.review.entity.Review;
import com.devpath.domain.review.repository.ReviewRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstructorCourseListQueryService {

  private static final String DEFAULT_COURSE_CATEGORY = "General";

  private final UserRepository userRepository;
  private final CourseRepository courseRepository;
  private final CourseEnrollmentRepository courseEnrollmentRepository;
  private final LessonRepository lessonRepository;
  private final CourseTagMapRepository courseTagMapRepository;
  private final QuestionRepository questionRepository;
  private final ReviewRepository reviewRepository;
  private final InstructorCourseThumbnailResolver thumbnailResolver;

  public List<InstructorCourseListResponse> getCourseList(Long instructorId) {
    validateAuthenticatedUser(instructorId);

    List<Course> courses = courseRepository.findAllByInstructorIdOrderByCourseIdDesc(instructorId);
    if (courses.isEmpty()) {
      return List.of();
    }

    Map<Long, List<CourseEnrollment>> enrollmentsByCourseId =
        courseEnrollmentRepository
            .findAllByCourseInstructorIdOrderByEnrolledAtDesc(instructorId)
            .stream()
            .collect(
                Collectors.groupingBy(
                    enrollment -> enrollment.getCourse().getCourseId(),
                    LinkedHashMap::new,
                    Collectors.toList()));

    Map<Long, List<Review>> reviewsByCourseId =
        reviewRepository.findAllByInstructorIdOrderByCreatedAtDesc(instructorId).stream()
            .collect(
                Collectors.groupingBy(
                    Review::getCourseId, LinkedHashMap::new, Collectors.toList()));

    return courses.stream()
        .map(
            course -> {
              List<CourseEnrollment> enrollments =
                  enrollmentsByCourseId.getOrDefault(course.getCourseId(), List.of()).stream()
                      .filter(this::isCountableEnrollment)
                      .toList();
              List<Review> reviews =
                  reviewsByCourseId.getOrDefault(course.getCourseId(), List.of());
              List<CourseTagMap> tagMaps =
                  courseTagMapRepository.findAllByCourseCourseId(course.getCourseId());
              List<String> tags = buildCourseTagNames(tagMaps);
              List<Lesson> lessons =
                  lessonRepository.findAllBySectionCourseCourseId(course.getCourseId());

              double averageProgressPercent =
                  enrollments.stream()
                      .map(CourseEnrollment::getProgressPercentage)
                      .filter(Objects::nonNull)
                      .mapToInt(Integer::intValue)
                      .average()
                      .orElse(0.0);
              double averageRating =
                  reviews.stream()
                      .map(Review::getRating)
                      .filter(Objects::nonNull)
                      .mapToInt(Integer::intValue)
                      .average()
                      .orElse(0.0);

              return new InstructorCourseListResponse(
                  course.getCourseId(),
                  course.getTitle(),
                  course.getStatus() == null ? null : course.getStatus().name(),
                  resolveCourseCategoryLabel(tagMaps),
                  course.getDifficultyLevel() == null ? "-" : course.getDifficultyLevel().name(),
                  course.getDurationSeconds(),
                  (long) lessons.size(),
                  (long) enrollments.size(),
                  round(averageProgressPercent),
                  questionRepository.countUnansweredByCourseId(course.getCourseId()),
                  (long) reviews.size(),
                  round(averageRating),
                  thumbnailResolver.resolve(course),
                  course.getCreatedAt(),
                  course.getPublishedAt(),
                  tags);
            })
        .toList();
  }

  private void validateAuthenticatedUser(Long instructorId) {
    if (instructorId == null) {
      throw new CustomException(ErrorCode.UNAUTHORIZED);
    }
    if (!userRepository.existsById(instructorId)) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
  }

  private boolean isCountableEnrollment(CourseEnrollment enrollment) {
    EnrollmentStatus status = enrollment.getStatus();
    return status == EnrollmentStatus.ACTIVE || status == EnrollmentStatus.COMPLETED;
  }

  private List<String> buildCourseTagNames(List<CourseTagMap> tagMaps) {
    return tagMaps.stream()
        .map(CourseTagMap::getTag)
        .filter(Objects::nonNull)
        .map(tag -> normalizeBlank(tag.getName()))
        .filter(Objects::nonNull)
        .distinct()
        .sorted()
        .toList();
  }

  private String resolveCourseCategoryLabel(List<CourseTagMap> tagMaps) {
    Map<String, Long> categoryCounts =
        tagMaps.stream()
            .map(CourseTagMap::getTag)
            .filter(Objects::nonNull)
            .map(tag -> normalizeCourseCategory(tag.getCategory()))
            .filter(Objects::nonNull)
            .collect(
                Collectors.groupingBy(
                    Function.identity(), LinkedHashMap::new, Collectors.counting()));

    if (categoryCounts.isEmpty()) {
      return DEFAULT_COURSE_CATEGORY;
    }

    return categoryCounts.entrySet().stream()
        .sorted(
            Comparator.<Map.Entry<String, Long>>comparingLong(Map.Entry::getValue)
                .reversed()
                .thenComparingInt(entry -> getCourseCategoryPriority(entry.getKey()))
                .thenComparing(Map.Entry::getKey))
        .map(Map.Entry::getKey)
        .findFirst()
        .orElse(DEFAULT_COURSE_CATEGORY);
  }

  private String normalizeCourseCategory(String value) {
    String normalized = normalizeBlank(value);
    if (normalized == null) {
      return null;
    }

    String categoryKey = normalized.toUpperCase(Locale.ROOT).replaceAll("[\\s/_-]+", "");
    return switch (categoryKey) {
      case "BACKEND", "SERVER", "백엔드" -> "Backend";
      case "FRONTEND", "CLIENT", "프론트엔드" -> "Frontend";
      case "AI", "AIDATA", "ARTIFICIALINTELLIGENCE", "MACHINELEARNING", "인공지능" -> "AI";
      case "DATABASE", "DB", "데이터베이스" -> "Database";
      case "DEVOPS", "데브옵스" -> "DevOps";
      case "FULLSTACK", "풀스택" -> "FullStack";
      case "GENERAL", "일반" -> DEFAULT_COURSE_CATEGORY;
      default -> null;
    };
  }

  private int getCourseCategoryPriority(String category) {
    return switch (category) {
      case "Backend" -> 1;
      case "Frontend" -> 2;
      case "AI" -> 3;
      case "Database" -> 4;
      case "DevOps" -> 5;
      case "FullStack" -> 6;
      case DEFAULT_COURSE_CATEGORY -> 7;
      default -> 99;
    };
  }

  private double round(double value) {
    return Math.round(value * 10.0) / 10.0;
  }

  private String normalizeBlank(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }
}
