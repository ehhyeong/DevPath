package com.devpath.api.review.entity;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "review")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long courseId;

    @Column(nullable = false)
    private Long learnerId;

    @Column(nullable = false)
    private Integer rating;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ReviewStatus status = ReviewStatus.UNANSWERED;

    @Builder.Default
    private Boolean isHidden = false;

    @Builder.Default
    private Boolean isDeleted = false;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Column(name = "issue_tags_raw")
    private String issueTagsRaw;

    public void changeStatus(ReviewStatus newStatus) {
        boolean valid = (this.status == ReviewStatus.UNANSWERED)
                || (this.status == ReviewStatus.ANSWERED && newStatus == ReviewStatus.UNSATISFIED);
        if (!valid) {
            throw new CustomException(ErrorCode.INVALID_STATUS_TRANSITION);
        }
        this.status = newStatus;
    }

    public void hide() {
        if (Boolean.TRUE.equals(this.isHidden)) {
            throw new CustomException(ErrorCode.REVIEW_ALREADY_HIDDEN);
        }
        this.isHidden = true;
    }

    public void resolveReport() {
        this.isHidden = false;
    }

    public void updateIssueTags(String issueTagsRaw) {
        this.issueTagsRaw = issueTagsRaw;
    }
}