package com.devpath.domain.learning.entity;

import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "learning_proofs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LearningProof {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "proof_id")
    private Long id;

    // 어떤 유저의 커스텀 노드에 대한 증명인가?
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "custom_node_id", nullable = false)
    private CustomRoadmapNode customNode;

    @Column(name = "proof_type", nullable = false, length = 50)
    private String proofType; // 예: QUIZ_PASSED, ASSIGNMENT_SUBMITTED

    @Column(name = "content_url", length = 500)
    private String contentUrl; // 깃허브 링크나 블로그 포스팅 링크

    @Column(columnDefinition = "TEXT")
    private String memo; // 제출 시 남기는 짧은 메모

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public LearningProof(CustomRoadmapNode customNode, String proofType, String contentUrl, String memo) {
        this.customNode = customNode;
        this.proofType = proofType;
        this.contentUrl = contentUrl;
        this.memo = memo;
    }
}