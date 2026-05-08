package com.devpath.domain.voice.entity;

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
@Table(name = "voice_participants")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VoiceParticipant {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "voice_participant_id")
  private Long id;

  // 참가자가 속한 보이스 채널이다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "voice_channel_id", nullable = false)
  private VoiceChannel channel;

  // 보이스 채널에 참가한 사용자다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  // 현재 보이스 채널에 접속 중인지 나타낸다.
  @Column(nullable = false)
  private Boolean active;

  // 현재 음소거 상태다.
  @Column(nullable = false)
  private Boolean muted;

  // 현재 손들기 상태다.
  @Column(name = "hand_raised", nullable = false)
  private Boolean handRaised;

  // 현재 발언 중 상태다.
  @Column(nullable = false)
  private Boolean speaking;

  // 가장 최근 참여 시간이다.
  @Column(name = "joined_at", nullable = false)
  private LocalDateTime joinedAt;

  // 가장 최근 퇴장 시간이다.
  @Column(name = "left_at")
  private LocalDateTime leftAt;

  // 참가자 이력 보존을 위해 물리 삭제 대신 논리 삭제를 사용한다.
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
  private VoiceParticipant(VoiceChannel channel, User user) {
    this.channel = channel;
    this.user = user;
    this.active = true;
    this.muted = false;
    this.handRaised = false;
    this.speaking = false;
    this.joinedAt = LocalDateTime.now();
    this.isDeleted = false;
  }

  // 이미 참가했던 사용자가 다시 들어올 때 현재 접속 상태로 갱신한다.
  public void rejoin() {
    this.active = true;
    this.leftAt = null;
    this.joinedAt = LocalDateTime.now();
  }

  // 보이스 채널에서 퇴장 처리한다.
  public void leave() {
    this.active = false;
    this.muted = false;
    this.handRaised = false;
    this.speaking = false;
    this.leftAt = LocalDateTime.now();
  }

  // 음소거 상태로 변경한다.
  public void mute() {
    this.muted = true;
  }

  // 음소거 해제 상태로 변경한다.
  public void unmute() {
    this.muted = false;
  }

  // 손들기 상태로 변경한다.
  public void raiseHand() {
    this.handRaised = true;
  }

  // 손들기 해제 상태로 변경한다.
  public void lowerHand() {
    this.handRaised = false;
  }

  // 발언 중 상태로 변경한다.
  public void startSpeaking() {
    this.speaking = true;
  }

  // 발언 중이 아닌 상태로 변경한다.
  public void stopSpeaking() {
    this.speaking = false;
  }

  // 참가자 정보를 논리 삭제한다.
  public void delete() {
    this.isDeleted = true;
  }
}
