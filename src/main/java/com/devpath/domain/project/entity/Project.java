package com.devpath.domain.project.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "project")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String intro;

    @Enumerated(EnumType.STRING)
    @Column(name = "project_type", nullable = false, length = 20)
    private ProjectType projectType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProjectStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ProjectVisibility visibility = ProjectVisibility.PRIVATE;

    @Enumerated(EnumType.STRING)
    @Column(name = "recruiting_status", nullable = false, length = 20)
    @Builder.Default
    private ProjectRecruitingStatus recruitingStatus = ProjectRecruitingStatus.CLOSED;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public void updateProject(String name, String description) {
        this.name = name;
        this.description = description;
    }

    public void updateIntro(String intro) {
        this.intro = intro;
    }

    public void changeStatus(ProjectStatus status) {
        this.status = status;
    }

    public void changeVisibility(ProjectVisibility visibility) {
        this.visibility = visibility;
    }

    public void changeRecruitingStatus(ProjectRecruitingStatus recruitingStatus) {
        this.recruitingStatus = recruitingStatus;
    }

    public void softDelete() {
        this.isDeleted = true;
    }
}