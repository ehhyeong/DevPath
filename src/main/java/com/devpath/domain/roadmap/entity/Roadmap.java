package com.devpath.domain.roadmap.entity;

import com.devpath.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "roadmaps")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Roadmap {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "roadmap_id")
    private Long roadmapId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY) // 지연 로딩 필수
    @JoinColumn(name = "creator_id")
    private User creator;

    @Builder.Default
    @Column(name = "is_official")
    private Boolean isOfficial = true;

    @Builder.Default
    @Column(name = "is_deleted")
    private Boolean isDeleted = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public void delete() {
        this.isDeleted = true;
    }
    public void deleteRoadmap() {
        this.isDeleted = true;
    }
}