package com.devpath.domain.learning.entity;

import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.user.entity.User;
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
@Table(name = "til_drafts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TilDraft {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "til_id")
  private Long id;

  // TIL을 작성한 학습자와의 연관관계다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  // TIL이 기반하는 강의 레슨과의 연관관계다. (선택 항목으로 null 허용)
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "lesson_id")
  private Lesson lesson;

  // TIL 제목이다.
  @Column(nullable = false, length = 300)
  private String title;

  // TIL 본문 내용으로 마크다운 형식을 지원한다.
  @Column(columnDefinition = "TEXT", nullable = false)
  private String content;

  // 마크다운 헤더 파싱을 통해 자동 생성된 목차를 JSON 문자열로 저장한다.
  @Column(name = "table_of_contents", columnDefinition = "TEXT")
  private String tableOfContents;

  // 현재 TIL의 상태(DRAFT/PUBLISHED)를 나타낸다.
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private TilDraftStatus status = TilDraftStatus.DRAFT;

  // 외부 블로그 발행 완료 시 해당 게시글의 URL을 저장한다.
  @Column(name = "published_url", length = 500)
  private String publishedUrl;

  // 논리 삭제 플래그다.
  @Column(name = "is_deleted", nullable = false)
  private Boolean isDeleted = false;

  // 생성 시각을 자동 저장한다.
  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  // 수정 시각을 자동 갱신한다.
  @UpdateTimestamp
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @Builder
  public TilDraft(User user, Lesson lesson, String title, String content) {
    this.user = user;
    this.lesson = lesson;
    this.title = title;
    this.content = content;
    this.status = TilDraftStatus.DRAFT;
    this.isDeleted = false;
  }

  // 제목과 본문을 수정한다.
  public void updateContent(String title, String content) {
    this.title = title;
    this.content = content;
  }

  // 자동 생성된 목차 JSON을 저장한다.
  public void updateTableOfContents(String tableOfContents) {
    this.tableOfContents = tableOfContents;
  }

  // 외부 블로그 발행 완료 처리 후 URL을 저장한다.
  public void publish(String publishedUrl) {
    this.status = TilDraftStatus.PUBLISHED;
    this.publishedUrl = publishedUrl;
  }

  // TIL을 soft delete 처리한다.
  public void delete() {
    this.isDeleted = true;
  }
}
