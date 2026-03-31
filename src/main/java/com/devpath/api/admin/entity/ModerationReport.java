package com.devpath.api.admin.entity;

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
@Table(name = "moderation_report")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@EntityListeners(AuditingEntityListener.class)
public class ModerationReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column
    private Long reporterUserId;

    @Column
    private Long targetUserId;

    @Column
    private Long contentId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ModerationReportStatus status = ModerationReportStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ModerationActionType actionTaken;

    @Column
    private Long resolvedBy;

    @Column
    private LocalDateTime resolvedAt;

    @CreatedDate
    private LocalDateTime createdAt;

    // 신고 처리 시 액션과 처리자, 처리 시각을 함께 남긴다.
    public void resolve(Long adminId, ModerationActionType actionType) {
        this.status = ModerationReportStatus.RESOLVED;
        this.actionTaken = actionType;
        this.resolvedBy = adminId;
        this.resolvedAt = LocalDateTime.now();
    }
}
