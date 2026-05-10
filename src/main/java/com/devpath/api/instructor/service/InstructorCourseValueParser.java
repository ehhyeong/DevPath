package com.devpath.api.instructor.service;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.CourseDifficultyLevel;
import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.entity.LessonType;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class InstructorCourseValueParser {

  public CourseStatus toCourseStatus(String status) {
    try {
      return CourseStatus.valueOf(status.toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException e) {
      throw new CustomException(ErrorCode.INVALID_COURSE_STATUS);
    }
  }

  public CourseDifficultyLevel toDifficultyLevel(String difficultyLevel) {
    if (difficultyLevel == null || difficultyLevel.isBlank()) {
      return null;
    }

    try {
      return CourseDifficultyLevel.valueOf(difficultyLevel.toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException e) {
      throw new CustomException(ErrorCode.INVALID_COURSE_DIFFICULTY_LEVEL);
    }
  }

  public LessonType toLessonType(String lessonType) {
    try {
      return LessonType.valueOf(lessonType.toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException | NullPointerException e) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }
  }
}
