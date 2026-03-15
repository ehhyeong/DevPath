package com.devpath.domain.course.entity;

import com.devpath.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "course_enrollments",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_enrollment_user_course",
            columnNames = {"user_id", "course_id"}
        )
    },
    indexes = {
        @Index(name = "idx_enrollment_user_id", columnList = "user_id"),
        @Index(name = "idx_enrollment_course_id", columnList = "course_id"),
        @Index(name = "idx_enrollment_status", columnList = "status")
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CourseEnrollment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "enrollment_id")
    private Long enrollmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EnrollmentStatus status = EnrollmentStatus.ACTIVE;

    @Column(name = "enrolled_at", nullable = false, updatable = false)
    private LocalDateTime enrolledAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "progress_percentage")
    @Builder.Default
    private Integer progressPercentage = 0;

    @Column(name = "last_accessed_at")
    private LocalDateTime lastAccessedAt;

    @Builder
    public CourseEnrollment(User user, Course course) {
        this.user = user;
        this.course = course;
        this.status = EnrollmentStatus.ACTIVE;
        this.progressPercentage = 0;
    }

    @PrePersist
    protected void onCreate() {
        this.enrolledAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = EnrollmentStatus.ACTIVE;
        }
        if (this.progressPercentage == null) {
            this.progressPercentage = 0;
        }
    }

    // 비즈니스 메서드
    public void updateProgress(Integer progressPercentage) {
        this.progressPercentage = progressPercentage;
        this.lastAccessedAt = LocalDateTime.now();
        
        if (progressPercentage >= 100 && this.completedAt == null) {
            complete();
        }
    }

    public void complete() {
        this.status = EnrollmentStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
        this.progressPercentage = 100;
    }

    public void cancel() {
        this.status = EnrollmentStatus.CANCELLED;
    }

    public void updateLastAccessed() {
        this.lastAccessedAt = LocalDateTime.now();
    }
}
