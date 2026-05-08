package com.devpath.domain.meeting.entity;

import com.devpath.domain.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "meeting_ai_summaries")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MeetingAiSummary {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "meeting_ai_summary_id")
  private Long id;

  // AI 요약이 연결된 회의방이다. 회의 하나에는 하나의 최신 요약만 유지한다.
  @OneToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "meeting_room_id", nullable = false, unique = true)
  private MeetingRoom meeting;

  // 요약을 저장하거나 갱신한 사용자다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "created_by_user_id", nullable = false)
  private User createdBy;

  // 회의 전체 요약 본문이다.
  @Column(nullable = false, columnDefinition = "TEXT")
  private String summary;

  // 회의 후속 작업 목록이다.
  @Column(name = "action_items", columnDefinition = "TEXT")
  private String actionItems;

  // 회의에서 결정된 사항 목록이다.
  @Column(columnDefinition = "TEXT")
  private String decisions;

  // 운영 이력 보존을 위해 물리 삭제 대신 논리 삭제를 사용한다.
  @Column(name = "is_deleted", nullable = false)
  private Boolean isDeleted;

  // 최초 저장 시간을 자동 기록한다.
  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  // 마지막 갱신 시간을 자동 기록한다.
  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @Builder
  private MeetingAiSummary(
      MeetingRoom meeting, User createdBy, String summary, String actionItems, String decisions) {
    this.meeting = meeting;
    this.createdBy = createdBy;
    this.summary = summary;
    this.actionItems = actionItems;
    this.decisions = decisions;
    this.isDeleted = false;
  }

  // 같은 회의에 이미 요약이 있는 경우 최신 요약 내용으로 갱신한다.
  public void update(User createdBy, String summary, String actionItems, String decisions) {
    this.createdBy = createdBy;
    this.summary = summary;
    this.actionItems = actionItems;
    this.decisions = decisions;
  }

  // AI 요약을 논리 삭제한다.
  public void delete() {
    this.isDeleted = true;
  }
}
