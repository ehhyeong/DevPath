package com.devpath.domain.meeting.entity;

import com.devpath.domain.mentoring.entity.Mentoring;
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
@Table(name = "meeting_rooms")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MeetingRoom {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "meeting_room_id")
  private Long id;

  // 회의가 속한 멘토링 워크스페이스다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "mentoring_id", nullable = false)
  private Mentoring mentoring;

  // 회의방을 생성한 사용자다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "host_id", nullable = false)
  private User host;

  // 회의방 제목이다.
  @Column(nullable = false, length = 150)
  private String title;

  // Jitsi, LiveKit 등 외부 화상회의 URL 또는 프론트 회의 라우팅 URL이다.
  @Column(name = "meeting_url", nullable = false, length = 1000)
  private String meetingUrl;

  // 회의 종료 후 녹화 파일 또는 외부 녹화 링크를 저장한다.
  @Column(name = "recording_url", length = 1000)
  private String recordingUrl;

  // 회의 예정 시간이다.
  @Column(name = "scheduled_at")
  private LocalDateTime scheduledAt;

  // 회의방이 생성되어 사용 가능해진 시간이다.
  @Column(name = "started_at", nullable = false)
  private LocalDateTime startedAt;

  // 회의 종료 시간이다.
  @Column(name = "ended_at")
  private LocalDateTime endedAt;

  // 회의방 상태를 enum으로 관리한다.
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private MeetingStatus status;

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
  private MeetingRoom(
      Mentoring mentoring, User host, String title, String meetingUrl, LocalDateTime scheduledAt) {
    this.mentoring = mentoring;
    this.host = host;
    this.title = title;
    this.meetingUrl = meetingUrl;
    this.scheduledAt = scheduledAt;
    this.startedAt = LocalDateTime.now();
    this.status = MeetingStatus.OPEN;
    this.isDeleted = false;
  }

  // 회의방을 종료 상태로 변경한다.
  public void end() {
    this.status = MeetingStatus.ENDED;
    this.endedAt = LocalDateTime.now();
  }

  // 회의 녹화 URL을 저장하거나 수정한다.
  public void updateRecordingUrl(String recordingUrl) {
    this.recordingUrl = recordingUrl;
  }

  // 회의방을 논리 삭제한다.
  public void delete() {
    this.isDeleted = true;
  }
}
