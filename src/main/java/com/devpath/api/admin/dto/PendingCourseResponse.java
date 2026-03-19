package com.devpath.api.admin.dto;

import com.devpath.domain.course.entity.Course;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "승인 대기(IN_REVIEW) 강의 응답 DTO")
public class PendingCourseResponse {

    @Schema(description = "강의 ID")
    private Long courseId;

    @Schema(description = "강의 제목")
    private String title;

    @Schema(description = "강사 ID")
    private Long instructorId;

    @Builder
    public PendingCourseResponse(Long courseId, String title, Long instructorId) {
        this.courseId = courseId;
        this.title = title;
        this.instructorId = instructorId;
    }

    // Entity -> DTO 변환 정적 메서드
    public static PendingCourseResponse from(Course course) {
        return PendingCourseResponse.builder()
                .courseId(course.getCourseId())
                .title(course.getTitle())
                .instructorId(course.getInstructorId())
                .build();
    }
}