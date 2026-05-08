package com.devpath.domain.ai.entity;

import com.devpath.domain.review.entity.PullRequestSubmission;
import com.devpath.domain.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
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
@Table(name = "ai_code_reviews")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiCodeReview {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "ai_code_review_id")
  private Long id;

  // AI 코드 리뷰를 요청한 사용자다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "requester_id", nullable = false)
  private User requester;

  // PR 제출 기반 리뷰일 경우 연결되는 PR이다. diffText만 리뷰하는 경우 null일 수 있다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "pull_request_submission_id")
  private PullRequestSubmission pullRequestSubmission;

  // AI 리뷰 제목이다.
  @Column(nullable = false, length = 150)
  private String title;

  // 리뷰 대상 diff 원문이다.
  @Lob
  @Column(name = "diff_text", nullable = false, columnDefinition = "TEXT")
  private String diffText;

  // AI 또는 rule-based 엔진이 생성한 전체 요약이다.
  @Column(nullable = false, columnDefinition = "TEXT")
  private String summary;

  // 감지된 전체 코멘트 개수다.
  @Column(name = "comment_count", nullable = false)
  private Integer commentCount;

  // 외부 AI API 또는 rule-based 엔진 이름이다.
  @Column(name = "provider_name", nullable = false, length = 50)
  private String providerName;

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
  private AiCodeReview(
      User requester,
      PullRequestSubmission pullRequestSubmission,
      String title,
      String diffText,
      String summary,
      Integer commentCount,
      String providerName) {
    this.requester = requester;
    this.pullRequestSubmission = pullRequestSubmission;
    this.title = title;
    this.diffText = diffText;
    this.summary = summary;
    this.commentCount = commentCount;
    this.providerName = providerName;
    this.isDeleted = false;
  }

  // AI 코드 리뷰를 논리 삭제한다.
  public void delete() {
    this.isDeleted = true;
  }
}
