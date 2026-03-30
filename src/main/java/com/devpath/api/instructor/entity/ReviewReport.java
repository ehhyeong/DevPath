package com.devpath.api.instructor.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
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
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "review_report")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@EntityListeners(AuditingEntityListener.class)
public class ReviewReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long reviewId;

    @Column(nullable = false)
    private Long reporterId;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isResolved = false;

    private Long resolvedBy;

    private LocalDateTime resolvedAt;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    // 신고 처리 시 처리자와 처리 시각을 함께 남긴다.
    public void resolve(Long resolverId) {
        this.isResolved = true;
        this.resolvedBy = resolverId;
        this.resolvedAt = LocalDateTime.now();
    }
}
