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
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "meeting_attendances")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MeetingAttendance {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "meeting_attendance_id")
  private Long id;

  // 출석 이력이 속한 회의방이다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "meeting_room_id", nullable = false)
  private MeetingRoom meeting;

  // 출석 대상 사용자다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  // 회의 입장 시간이다.
  @Column(name = "joined_at", nullable = false)
  private LocalDateTime joinedAt;

  // 회의 퇴장 시간이다.
  @Column(name = "left_at")
  private LocalDateTime leftAt;

  // 출석 이력 보존을 위해 물리 삭제 대신 논리 삭제를 사용한다.
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
  private MeetingAttendance(MeetingRoom meeting, User user) {
    this.meeting = meeting;
    this.user = user;
    this.joinedAt = LocalDateTime.now();
    this.isDeleted = false;
  }

  // 퇴장 시간을 기록한다.
  public void leave() {
    this.leftAt = LocalDateTime.now();
  }

  // 현재까지 또는 퇴장 시각까지의 참여 시간을 초 단위로 계산한다.
  public long getDurationSeconds() {
    LocalDateTime endTime = this.leftAt == null ? LocalDateTime.now() : this.leftAt;
    return Duration.between(this.joinedAt, endTime).toSeconds();
  }

  // 출석 이력을 논리 삭제한다.
  public void delete() {
    this.isDeleted = true;
  }
}
