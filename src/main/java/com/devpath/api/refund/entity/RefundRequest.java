package com.devpath.api.refund.entity;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "refund_request")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@EntityListeners(AuditingEntityListener.class)
public class RefundRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long learnerId;

    @Column(nullable = false)
    private Long courseId;

    @Column(nullable = false)
    private Long instructorId;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(nullable = false)
    private LocalDateTime enrolledAt;

    @Column(nullable = false)
    private Integer progressPercentSnapshot;

    @Column(nullable = false)
    private Long refundAmount;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private RefundStatus status = RefundStatus.PENDING;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isDeleted = false;

    @CreatedDate
    private LocalDateTime requestedAt;

    private LocalDateTime processedAt;

    // 환불 승인/반려는 PENDING 상태에서만 가능하다.
    public void approve() {
        if (this.status != RefundStatus.PENDING) {
            throw new CustomException(ErrorCode.REFUND_ALREADY_PROCESSED);
        }
        this.status = RefundStatus.APPROVED;
        this.processedAt = LocalDateTime.now();
    }

    public void reject() {
        if (this.status != RefundStatus.PENDING) {
            throw new CustomException(ErrorCode.REFUND_ALREADY_PROCESSED);
        }
        this.status = RefundStatus.REJECTED;
        this.processedAt = LocalDateTime.now();
    }
}
