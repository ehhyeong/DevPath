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
@Table(name = "custom_roadmaps")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CustomRoadmap {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "custom_roadmap_id")
    private Long id;

    // 이 로드맵을 복사해서 내 것으로 만든 유저 (LAZY 로딩)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 복사의 원본이 된 마스터 로드맵
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "original_roadmap_id", nullable = false)
    private Roadmap originalRoadmap;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "progress_rate", nullable = false)
    private Integer progressRate = 0; // 진행률 (0~100%)

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder
    public CustomRoadmap(User user, Roadmap originalRoadmap, String title) {
        this.user = user;
        this.originalRoadmap = originalRoadmap;
        this.title = title;
        this.progressRate = 0; // 처음 복사했을 땐 진척도 0%
    }

    // 진척도 업데이트 비즈니스 메서드 (무분별한 Setter 금지)
    public void updateProgressRate(Integer newRate) {
        this.progressRate = newRate;
    }
}