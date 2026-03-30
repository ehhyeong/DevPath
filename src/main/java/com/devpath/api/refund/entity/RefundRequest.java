package com.devpath.api.refund.entity;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

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

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RefundStatus status = RefundStatus.PENDING;

    @Builder.Default
    private Boolean isDeleted = false;

    @CreatedDate
    private LocalDateTime requestedAt;

    private LocalDateTime processedAt;

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