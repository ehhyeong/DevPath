package com.devpath.domain.learning.entity.clearance;

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

// 노드 클리어 판정 근거를 저장한다.
@Entity
@Table(name = "node_clearance_reasons")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NodeClearanceReason {

    // 판정 근거 PK다.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "node_clearance_reason_id")
    private Long id;

    // 어떤 노드 클리어 결과의 근거인지 나타낸다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "node_clearance_id", nullable = false)
    private NodeClearance nodeClearance;

    // 근거 유형이다.
    @Enumerated(EnumType.STRING)
    @Column(name = "reason_type", nullable = false, length = 50)
    private ClearanceReasonType reasonType;

    // 해당 근거 충족 여부다.
    @Column(name = "is_satisfied", nullable = false)
    private Boolean satisfied;

    // 근거 상세 메시지다.
    @Column(name = "detail_message", nullable = false, columnDefinition = "TEXT")
    private String detailMessage;

    // 생성 시각이다.
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // 판정 근거 엔티티를 생성한다.
    @Builder
    public NodeClearanceReason(
        NodeClearance nodeClearance,
        ClearanceReasonType reasonType,
        Boolean satisfied,
        String detailMessage
    ) {
        this.nodeClearance = nodeClearance;
        this.reasonType = reasonType;
        this.satisfied = satisfied;
        this.detailMessage = detailMessage;
    }
}
