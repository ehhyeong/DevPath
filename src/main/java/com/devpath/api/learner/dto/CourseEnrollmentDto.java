package com.devpath.api.learner.dto;

import com.devpath.domain.course.entity.CourseEnrollment;
import com.devpath.domain.course.entity.EnrollmentStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

public class CourseEnrollmentDto {

    /**
     * 수강 신청 요청
     */
    @Getter
    @Builder
    public static class EnrollRequest {
        private Long courseId;
    }

    /**
     * 수강 신청 응답
     */
    @Getter
    @Builder
    public static class EnrollResponse {
        private Long enrollmentId;
        private Long courseId;
        private String courseTitle;
        private EnrollmentStatus status;
        private LocalDateTime enrolledAt;

        public static EnrollResponse from(CourseEnrollment enrollment) {
            return EnrollResponse.builder()
                    .enrollmentId(enrollment.getEnrollmentId())
                    .courseId(enrollment.getCourse().getCourseId())
                    .courseTitle(enrollment.getCourse().getTitle())
                    .status(enrollment.getStatus())
                    .enrolledAt(enrollment.getEnrolledAt())
                    .build();
        }
    }

    /**
     * 수강 내역 조회 응답
     */
    @Getter
    @Builder
    public static class EnrollmentResponse {
        private Long enrollmentId;
        private Long courseId;
        private String courseTitle;
        private String instructorName;
        private String thumbnailUrl;
        private EnrollmentStatus status;
        private Integer progressPercentage;
        private LocalDateTime enrolledAt;
        private LocalDateTime completedAt;
        private LocalDateTime lastAccessedAt;

        public static EnrollmentResponse from(CourseEnrollment enrollment) {
            return EnrollmentResponse.builder()
                    .enrollmentId(enrollment.getEnrollmentId())
                    .courseId(enrollment.getCourse().getCourseId())
                    .courseTitle(enrollment.getCourse().getTitle())
                    .instructorName(enrollment.getCourse().getInstructor().getName())
                    .thumbnailUrl(enrollment.getCourse().getThumbnailUrl())
                    .status(enrollment.getStatus())
                    .progressPercentage(enrollment.getProgressPercentage())
                    .enrolledAt(enrollment.getEnrolledAt())
                    .completedAt(enrollment.getCompletedAt())
                    .lastAccessedAt(enrollment.getLastAccessedAt())
                    .build();
        }
    }

    /**
     * 진도율 업데이트 요청
     */
    @Getter
    @Builder
    public static class UpdateProgressRequest {
        private Integer progressPercentage;
    }
}
