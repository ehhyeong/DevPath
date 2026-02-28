package com.devpath.domain.roadmap.entity;

import com.devpath.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "roadmaps")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Roadmap {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "roadmap_id")
    private Long id;

    // 작성자 (User와 다대일 관계)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_public", nullable = false)
    private Boolean isPublic = true; // 공개/비공개 여부

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false; // 논리적 삭제 (Soft Delete)

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder
    public Roadmap(User author, String title, String description, Boolean isPublic) {
        this.author = author;
        this.title = title;
        this.description = description;
        this.isPublic = (isPublic != null) ? isPublic : true;
        this.isDeleted = false;
    }

    // 로드맵 삭제 비즈니스 메서드 (실제 삭제 안 하고 상태만 변경)
    public void deleteRoadmap() {
        this.isDeleted = true;
    }
}