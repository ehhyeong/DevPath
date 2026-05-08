package com.devpath.api.learning.service;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseEnrollment;
import com.devpath.domain.course.entity.CourseTagMap;
import com.devpath.domain.course.entity.EnrollmentStatus;
import com.devpath.domain.course.repository.CourseEnrollmentRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseTagMapRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserTechStack;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CourseCompletionTagService {

  private final UserRepository userRepository;
  private final CourseRepository courseRepository;
  private final CourseEnrollmentRepository courseEnrollmentRepository;
  private final CourseTagMapRepository courseTagMapRepository;
  private final LessonRepository lessonRepository;
  private final LessonProgressRepository lessonProgressRepository;
  private final UserTechStackRepository userTechStackRepository;

  @Transactional
  public void syncCourseCompletion(Long userId, Long courseId) {
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    Course course =
        courseRepository
            .findById(courseId)
            .orElseThrow(() -> new CustomException(ErrorCode.COURSE_NOT_FOUND));

    syncCourseCompletion(user, course);
  }

  @Transactional
  public void syncCourseCompletion(User user, Course course) {
    if (user == null || course == null || course.getCourseId() == null) {
      return;
    }

    int progressPercentage = calculateProgressPercentage(user.getId(), course.getCourseId());
    courseEnrollmentRepository
        .findByUser_IdAndCourse_CourseId(user.getId(), course.getCourseId())
        .ifPresent(enrollment -> enrollment.updateProgress(progressPercentage));

    if (progressPercentage >= 100) {
      grantCourseTags(user, course.getCourseId());
    }
  }

  @Transactional
  public void syncCompletedCourseTags(Long userId) {
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

    List<CourseEnrollment> enrollments =
        courseEnrollmentRepository.findAllByUserIdWithCourse(userId);
    for (CourseEnrollment enrollment : enrollments) {
      if (isEnrollmentAlreadyCompleted(enrollment)) {
        grantCourseTags(user, enrollment.getCourse().getCourseId());
        continue;
      }

      syncCourseCompletion(user, enrollment.getCourse());
    }
  }

  private int calculateProgressPercentage(Long userId, Long courseId) {
    long totalLessonCount = lessonRepository.countPublishedLessonsByCourseIds(List.of(courseId));
    if (totalLessonCount == 0L) {
      return 0;
    }

    long completedLessonCount =
        lessonProgressRepository.countCompletedLessonsByUserIdAndCourseIds(
            userId, List.of(courseId));
    return (int) Math.min(100L, completedLessonCount * 100L / totalLessonCount);
  }

  private boolean isEnrollmentAlreadyCompleted(CourseEnrollment enrollment) {
    return EnrollmentStatus.COMPLETED.equals(enrollment.getStatus())
        || (enrollment.getProgressPercentage() != null
            && enrollment.getProgressPercentage() >= 100);
  }

  private void grantCourseTags(User user, Long courseId) {
    List<CourseTagMap> courseTagMaps = courseTagMapRepository.findAllByCourseCourseId(courseId);
    if (courseTagMaps.isEmpty()) {
      return;
    }

    Set<Long> handledTagIds = new HashSet<>();
    List<UserTechStack> acquiredTags = new ArrayList<>();

    for (CourseTagMap courseTagMap : courseTagMaps) {
      if (courseTagMap.getTag() == null || courseTagMap.getTag().getTagId() == null) {
        continue;
      }

      Long tagId = courseTagMap.getTag().getTagId();
      if (!handledTagIds.add(tagId)) {
        continue;
      }

      if (userTechStackRepository.existsByUser_IdAndTag_TagId(user.getId(), tagId)) {
        continue;
      }

      acquiredTags.add(UserTechStack.builder().user(user).tag(courseTagMap.getTag()).build());
    }

    if (!acquiredTags.isEmpty()) {
      userTechStackRepository.saveAll(acquiredTags);
    }
  }
}
