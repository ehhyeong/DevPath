package com.devpath.api.review.entity;

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
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

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
  @Column(nullable = false, length = 20)
  private ReviewStatus status = ReviewStatus.UNANSWERED;

  @Builder.Default
  @Column(nullable = false)
  private Boolean isHidden = false;

  @Builder.Default
  @Column(nullable = false)
  private Boolean isDeleted = false;

  @CreatedDate private LocalDateTime createdAt;

  @LastModifiedDate private LocalDateTime updatedAt;

  @Column(name = "issue_tags_raw")
  private String issueTagsRaw;

  // Review moderation only allows transitions around the answered flow.
  public void changeStatus(ReviewStatus newStatus) {
    boolean valid =
        switch (this.status) {
          case UNANSWERED -> newStatus == ReviewStatus.ANSWERED;
          case ANSWERED ->
              newStatus == ReviewStatus.UNSATISFIED || newStatus == ReviewStatus.ANSWERED;
          case UNSATISFIED ->
              newStatus == ReviewStatus.ANSWERED || newStatus == ReviewStatus.UNSATISFIED;
        };

    if (!valid) {
      throw new CustomException(ErrorCode.INVALID_STATUS_TRANSITION);
    }

    this.status = newStatus;
  }

  public void markAnswered() {
    this.status = ReviewStatus.ANSWERED;
  }

  public void markUnanswered() {
    this.status = ReviewStatus.UNANSWERED;
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
