package com.devpath.domain.voice.entity;

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

@Entity
@Table(name = "voice_events")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VoiceEvent {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "voice_event_id")
  private Long id;

  // 이벤트가 발생한 보이스 채널이다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "voice_channel_id", nullable = false)
  private VoiceChannel channel;

  // 이벤트를 발생시킨 사용자다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "actor_id", nullable = false)
  private User actor;

  // 음소거, 손들기, 발언 상태 같은 이벤트 타입이다.
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private VoiceEventType type;

  // 이벤트와 함께 남길 선택 메모다.
  @Column(length = 500)
  private String memo;

  // 최초 이벤트 발생 시간을 자동 기록한다.
  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Builder
  private VoiceEvent(VoiceChannel channel, User actor, VoiceEventType type, String memo) {
    this.channel = channel;
    this.actor = actor;
    this.type = type;
    this.memo = memo;
  }
}
