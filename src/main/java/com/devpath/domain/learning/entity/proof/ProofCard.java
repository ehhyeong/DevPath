package com.devpath.domain.learning.entity.proof;

import com.devpath.domain.learning.entity.clearance.NodeClearance;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

// Proof Card 정보를 저장한다.
@Entity
@Table(
    name = "proof_cards",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_proof_cards_user_node",
            columnNames = {"user_id", "node_id"}
        ),
        @UniqueConstraint(
            name = "uk_proof_cards_node_clearance",
            columnNames = {"node_clearance_id"}
        )
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProofCard {

    // Proof Card PK다.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "proof_card_id")
    private Long id;

    // 발급 대상 학습자다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 연결된 로드맵 노드다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "node_id", nullable = false)
    private RoadmapNode node;

    // Proof Card 발급 근거가 된 노드 클리어 결과다.
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "node_clearance_id", nullable = false, unique = true)
    private NodeClearance nodeClearance;

    // 카드 제목이다.
    @Column(name = "title", nullable = false, length = 200)
    private String title;

    // 카드 설명이다.
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    // 현재 카드 상태다.
    @Enumerated(EnumType.STRING)
    @Column(name = "proof_card_status", nullable = false, length = 30)
    private ProofCardStatus status;

    // 발급 시각이다.
    @Column(name = "issued_at", nullable = false)
    private LocalDateTime issuedAt;

    // 생성 시각이다.
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // 수정 시각이다.
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Proof Card 엔티티를 생성한다.
    @Builder
    public ProofCard(
        User user,
        RoadmapNode node,
        NodeClearance nodeClearance,
        String title,
        String description,
        ProofCardStatus status,
        LocalDateTime issuedAt
    ) {
        this.user = user;
        this.node = node;
        this.nodeClearance = nodeClearance;
        this.title = title;
        this.description = description;
        this.status = status == null ? ProofCardStatus.ISSUED : status;
        this.issuedAt = issuedAt == null ? LocalDateTime.now() : issuedAt;
    }

    // 카드 상태를 회수로 변경한다.
    public void revoke() {
        this.status = ProofCardStatus.REVOKED;
    }
}
