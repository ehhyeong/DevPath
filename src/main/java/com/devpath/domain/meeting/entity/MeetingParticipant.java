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
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "meeting_participants")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MeetingParticipant {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "meeting_participant_id")
  private Long id;

  // 참가자가 속한 회의방이다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "meeting_room_id", nullable = false)
  private MeetingRoom meeting;

  // 회의에 참가한 사용자다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  // 현재 회의방에 접속 중인지 나타낸다.
  @Column(nullable = false)
  private Boolean active;

  // 가장 최근 참가 시간이다.
  @Column(name = "joined_at", nullable = false)
  private LocalDateTime joinedAt;

  // 가장 최근 퇴장 시간이다.
  @Column(name = "left_at")
  private LocalDateTime leftAt;

  // 참가자 상태 이력 보존을 위해 물리 삭제 대신 논리 삭제를 사용한다.
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
  private MeetingParticipant(MeetingRoom meeting, User user) {
    this.meeting = meeting;
    this.user = user;
    this.active = true;
    this.joinedAt = LocalDateTime.now();
    this.isDeleted = false;
  }

  // 이미 참가했던 사용자가 다시 입장할 때 현재 참가 상태로 갱신한다.
  public void rejoin() {
    this.active = true;
    this.joinedAt = LocalDateTime.now();
    this.leftAt = null;
  }

  // 현재 참가자를 퇴장 상태로 변경한다.
  public void leave() {
    this.active = false;
    this.leftAt = LocalDateTime.now();
  }

  // 참가자 정보를 논리 삭제한다.
  public void delete() {
    this.isDeleted = true;
  }
}
