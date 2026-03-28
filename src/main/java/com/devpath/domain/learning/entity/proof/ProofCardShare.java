package com.devpath.domain.learning.entity.proof;

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
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

// Proof Card 공유 링크 정보를 저장한다.
@Entity
@Table(name = "proof_card_shares")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProofCardShare {

    // Proof Card Share PK다.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "proof_card_share_id")
    private Long id;

    // 공유 대상 Proof Card다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proof_card_id", nullable = false)
    private ProofCard proofCard;

    // 외부 공유 토큰이다.
    @Column(name = "share_token", nullable = false, unique = true, length = 100)
    private String shareToken;

    // 링크 상태다.
    @Enumerated(EnumType.STRING)
    @Column(name = "share_status", nullable = false, length = 30)
    private ProofShareLinkStatus status;

    // 링크 만료 시각이다.
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    // 조회 수다.
    @Column(name = "access_count", nullable = false)
    private Long accessCount;

    // 생성 시각이다.
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // 수정 시각이다.
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Proof Card Share 엔티티를 생성한다.
    @Builder
    public ProofCardShare(
        ProofCard proofCard,
        String shareToken,
        ProofShareLinkStatus status,
        LocalDateTime expiresAt,
        Long accessCount
    ) {
        this.proofCard = proofCard;
        this.shareToken = shareToken;
        this.status = status == null ? ProofShareLinkStatus.ACTIVE : status;
        this.expiresAt = expiresAt;
        this.accessCount = accessCount == null ? 0L : accessCount;
    }

    // 링크 조회 수를 증가시킨다.
    public void increaseAccessCount() {
        this.accessCount += 1L;
    }

    // 링크 상태를 회수로 변경한다.
    public void revoke() {
        this.status = ProofShareLinkStatus.REVOKED;
    }

    // 링크 상태를 만료로 변경한다.
    public void expire() {
        this.status = ProofShareLinkStatus.EXPIRED;
    }

    // 링크가 만료되었는지 확인한다.
    public boolean isExpired() {
        return this.expiresAt != null && this.expiresAt.isBefore(LocalDateTime.now());
    }
}
