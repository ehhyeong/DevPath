package com.devpath.api.instructor.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.CourseDifficultyLevel;
import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.entity.LessonType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class InstructorCourseValueParserTest {

  private InstructorCourseValueParser parser;

  @BeforeEach
  void setUp() {
    parser = new InstructorCourseValueParser();
  }

  @Test
  void toCourseStatus_parsesCaseInsensitiveValue() {
    assertThat(parser.toCourseStatus("published")).isEqualTo(CourseStatus.PUBLISHED);
  }

  @Test
  void toCourseStatus_rejectsUnknownValue() {
    assertThatThrownBy(() -> parser.toCourseStatus("unknown"))
        .isInstanceOf(CustomException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.INVALID_COURSE_STATUS);
  }

  @Test
  void toDifficultyLevel_returnsNullWhenBlank() {
    assertThat(parser.toDifficultyLevel(" ")).isNull();
  }

  @Test
  void toDifficultyLevel_parsesCaseInsensitiveValue() {
    assertThat(parser.toDifficultyLevel("beginner")).isEqualTo(CourseDifficultyLevel.BEGINNER);
  }

  @Test
  void toLessonType_parsesCaseInsensitiveValue() {
    assertThat(parser.toLessonType("video")).isEqualTo(LessonType.VIDEO);
  }
}
