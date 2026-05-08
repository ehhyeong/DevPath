package com.devpath.domain.ai.entity;

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
@Table(name = "ai_design_suggestions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiDesignSuggestion {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "ai_design_suggestion_id")
  private Long id;

  // 어떤 AI 설계 리뷰에 대한 개선 제안인지 연결한다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "ai_design_review_id", nullable = false)
  private AiDesignReview designReview;

  // 개선 제안을 등록한 사용자다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "created_by_user_id", nullable = false)
  private User createdBy;

  // 개선 제안 카테고리다.
  @Column(nullable = false, length = 100)
  private String category;

  // 개선 제안 제목이다.
  @Column(nullable = false, length = 150)
  private String title;

  // 개선 제안 상세 내용이다.
  @Lob
  @Column(nullable = false, columnDefinition = "TEXT")
  private String content;

  // 개선 우선순위다. 예: HIGH, MEDIUM, LOW
  @Column(nullable = false, length = 20)
  private String priority;

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
  private AiDesignSuggestion(
      AiDesignReview designReview,
      User createdBy,
      String category,
      String title,
      String content,
      String priority) {
    this.designReview = designReview;
    this.createdBy = createdBy;
    this.category = category;
    this.title = title;
    this.content = content;
    this.priority = priority;
    this.isDeleted = false;
  }

  // 개선 제안을 논리 삭제한다.
  public void delete() {
    this.isDeleted = true;
  }
}
