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
@Table(name = "ai_design_reviews")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiDesignReview {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "ai_design_review_id")
  private Long id;

  // AI 설계 리뷰를 요청한 사용자다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "requester_id", nullable = false)
  private User requester;

  // 설계 리뷰 제목이다.
  @Column(nullable = false, length = 150)
  private String title;

  // ERD 텍스트, 테이블 정의, 관계 설명 등을 저장한다.
  @Lob
  @Column(name = "erd_text", nullable = false, columnDefinition = "TEXT")
  private String erdText;

  // API 명세 텍스트, 엔드포인트 목록, Request/Response 설명 등을 저장한다.
  @Lob
  @Column(name = "api_spec_text", nullable = false, columnDefinition = "TEXT")
  private String apiSpecText;

  // rule-based 또는 외부 AI가 생성한 설계 리뷰 요약이다.
  @Column(nullable = false, columnDefinition = "TEXT")
  private String summary;

  // 리뷰 엔진 이름이다.
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
  private AiDesignReview(
      User requester,
      String title,
      String erdText,
      String apiSpecText,
      String summary,
      String providerName) {
    this.requester = requester;
    this.title = title;
    this.erdText = erdText;
    this.apiSpecText = apiSpecText;
    this.summary = summary;
    this.providerName = providerName;
    this.isDeleted = false;
  }

  // 설계 리뷰를 논리 삭제한다.
  public void delete() {
    this.isDeleted = true;
  }
}
