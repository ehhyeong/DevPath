package com.devpath.domain.mentoring.entity;

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
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "mentoring_posts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MentoringPost {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "mentoring_post_id")
  private Long id;

  // 공고 작성자인 멘토를 참조한다. 조회 비용을 제어하기 위해 LAZY 로딩을 사용한다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "mentor_id", nullable = false)
  private User mentor;

  // 목록과 상세 화면에 노출되는 공고 제목이다.
  @Column(nullable = false, length = 150)
  private String title;

  // 멘토링 소개, 진행 방식, 신청 조건을 저장한다.
  @Column(nullable = false, columnDefinition = "TEXT")
  private String content;

  // 공고에서 요구하는 기술 스택을 쉼표 구분 문자열로 관리한다.
  @Column(name = "required_stacks", length = 500)
  private String requiredStacks;

  @Column(length = 60)
  private String category;

  @Column(name = "mentoring_type", length = 30)
  private String mentoringType;

  @Column(name = "duration_weeks")
  private Integer durationWeeks;

  @Column(columnDefinition = "TEXT")
  private String curriculum;

  @Column(name = "deadline_at")
  private LocalDate deadlineAt;

  @Column(name = "current_participants")
  private Integer currentParticipants;

  // 신청 가능한 최대 인원이다.
  @Column(name = "max_participants", nullable = false)
  private Integer maxParticipants;

  @Column(name = "view_count")
  private Long viewCount;

  // 공고 상태를 enum으로 고정해 문자열 오입력을 방지한다.
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private MentoringPostStatus status;

  // 물리 삭제 대신 논리 삭제 상태를 저장한다.
  @Column(name = "is_deleted", nullable = false)
  private Boolean isDeleted;

  // 최초 생성 시간을 자동으로 기록한다.
  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  // 마지막 수정 시간을 자동으로 기록한다.
  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @Builder
  private MentoringPost(
      User mentor,
      String title,
      String content,
      String requiredStacks,
      String category,
      String mentoringType,
      Integer durationWeeks,
      String curriculum,
      LocalDate deadlineAt,
      Integer currentParticipants,
      Integer maxParticipants) {
    this.mentor = mentor;
    this.title = title;
    this.content = content;
    this.requiredStacks = requiredStacks;
    this.category = normalize(category, "Backend");
    this.mentoringType = normalize(mentoringType, "study");
    this.durationWeeks = durationWeeks == null ? 4 : Math.max(1, durationWeeks);
    this.curriculum = curriculum;
    this.deadlineAt = deadlineAt;
    this.currentParticipants = currentParticipants == null ? 0 : Math.max(0, currentParticipants);
    this.maxParticipants = maxParticipants;
    this.viewCount = 0L;
    this.status = MentoringPostStatus.OPEN;
    this.isDeleted = false;
  }

  // 공고의 수정 가능한 필드만 변경한다.
  public void update(String title, String content, String requiredStacks, Integer maxParticipants) {
    this.title = title;
    this.content = content;
    this.requiredStacks = requiredStacks;
    this.maxParticipants = maxParticipants;
  }

  public void updateHubFields(
      String category,
      String mentoringType,
      Integer durationWeeks,
      String curriculum,
      LocalDate deadlineAt,
      Integer currentParticipants) {
    this.category = normalize(category, this.category == null ? "Backend" : this.category);
    this.mentoringType =
        normalize(mentoringType, this.mentoringType == null ? "study" : this.mentoringType);
    this.durationWeeks = durationWeeks == null ? this.durationWeeks : Math.max(1, durationWeeks);
    this.curriculum = curriculum;
    this.deadlineAt = deadlineAt;
    this.currentParticipants =
        currentParticipants == null ? this.currentParticipants : Math.max(0, currentParticipants);
  }

  public void increaseViewCount() {
    this.viewCount = this.viewCount == null ? 1L : this.viewCount + 1L;
  }

  // 공고를 마감 상태로 변경한다.
  public void close() {
    this.status = MentoringPostStatus.CLOSED;
  }

  // 공고를 다시 신청 가능한 상태로 변경한다.
  public void reopen() {
    this.status = MentoringPostStatus.OPEN;
  }

  // 공고를 논리 삭제하고 신청도 막는다.
  public void delete() {
    this.isDeleted = true;
    this.status = MentoringPostStatus.CLOSED;
  }

  private static String normalize(String value, String fallback) {
    if (value == null || value.isBlank()) {
      return fallback;
    }
    return value.trim();
  }
}
