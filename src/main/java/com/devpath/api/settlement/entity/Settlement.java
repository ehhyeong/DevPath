package com.devpath.api.settlement.entity;

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
@Table(name = "settlement")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Settlement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long instructorId;

    @Column(nullable = false)
    private Long amount;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private SettlementStatus status = SettlementStatus.PENDING;

    @Builder.Default
    private Boolean isDeleted = false;

    private LocalDateTime settledAt;

    @CreatedDate
    private LocalDateTime createdAt;

    public void hold() {
        if (this.status != SettlementStatus.PENDING) {
            throw new CustomException(ErrorCode.SETTLEMENT_NOT_PENDING);
        }
        this.status = SettlementStatus.HELD;
    }
}