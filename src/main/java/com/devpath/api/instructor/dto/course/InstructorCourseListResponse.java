package com.devpath.api.instructor.dto.course;

import java.time.LocalDateTime;
import java.util.List;

public record InstructorCourseListResponse(
    Long courseId,
    String title,
    String status,
    String categoryLabel,
    String levelLabel,
    Integer durationSeconds,
    Long lessonCount,
    Long studentCount,
    Double averageProgressPercent,
    Long pendingQuestionCount,
    Long reviewCount,
    Double averageRating,
    String thumbnailUrl,
    LocalDateTime createdAt,
    LocalDateTime publishedAt,
    List<String> tags) {}
