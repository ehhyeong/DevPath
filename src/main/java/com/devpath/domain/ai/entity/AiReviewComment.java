package com.devpath.domain.ai.entity;

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

@Entity
@Table(name = "ai_review_comments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiReviewComment {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "ai_review_comment_id")
  private Long id;

  // 어떤 AI 코드 리뷰에서 생성된 코멘트인지 연결한다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "ai_code_review_id", nullable = false)
  private AiCodeReview aiCodeReview;

  // 위반 유형 또는 리뷰 카테고리다.
  @Column(nullable = false, length = 100)
  private String category;

  // 문제가 발생한 라인 번호다. 정확히 계산하기 어려운 경우 null일 수 있다.
  @Column(name = "line_number")
  private Integer lineNumber;

  // AI 리뷰 코멘트 제목이다.
  @Column(nullable = false, length = 150)
  private String title;

  // 상세 설명이다.
  @Column(nullable = false, columnDefinition = "TEXT")
  private String message;

  // 개선 제안이다.
  @Column(name = "suggestion", columnDefinition = "TEXT")
  private String suggestion;

  // 사용자의 수용/반려 상태다.
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private AiReviewCommentStatus status;

  // 사용자가 수용 또는 반려 처리한 시간이다.
  @Column(name = "decided_at")
  private LocalDateTime decidedAt;

  // 운영 이력 보존을 위해 물리 삭제 대신 논리 삭제를 사용한다.
  @Column(name = "is_deleted", nullable = false)
  private Boolean isDeleted;

  // 최초 생성 시간을 자동 기록한다.
  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  // 마지막 수정 시간을 자동 기록한다.
  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @Builder
  private AiReviewComment(
      AiCodeReview aiCodeReview,
      String category,
      Integer lineNumber,
      String title,
      String message,
      String suggestion) {
    this.aiCodeReview = aiCodeReview;
    this.category = category;
    this.lineNumber = lineNumber;
    this.title = title;
    this.message = message;
    this.suggestion = suggestion;
    this.status = AiReviewCommentStatus.PENDING;
    this.isDeleted = false;
  }

  // AI 리뷰 코멘트를 수용 상태로 변경한다.
  public void accept() {
    this.status = AiReviewCommentStatus.ACCEPTED;
    this.decidedAt = LocalDateTime.now();
  }

  // AI 리뷰 코멘트를 반려 상태로 변경한다.
  public void reject() {
    this.status = AiReviewCommentStatus.REJECTED;
    this.decidedAt = LocalDateTime.now();
  }

  // AI 리뷰 코멘트를 논리 삭제한다.
  public void delete() {
    this.isDeleted = true;
  }
}
