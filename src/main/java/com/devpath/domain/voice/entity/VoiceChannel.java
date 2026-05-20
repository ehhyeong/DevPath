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
@Table(name = "voice_channels")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VoiceChannel {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "voice_channel_id")
  private Long id;

  // A 담당 워크스페이스 Entity와 충돌을 줄이기 위해 ID만 느슨하게 참조한다.
  @Column(name = "workspace_id", nullable = false)
  private Long workspaceId;

  // 보이스 채널을 생성한 사용자다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "creator_id", nullable = false)
  private User creator;

  // 워크스페이스 화면에 노출되는 보이스 채널 이름이다.
  @Column(nullable = false, length = 150)
  private String name;

  // 보이스 채널 안내 문구다.
  @Column(length = 500)
  private String description;

  // 현재 진행 중인 회의 세션의 시작 시간이다. 아무도 접속 중이지 않으면 비어 있다.
  @Column(name = "current_session_started_at")
  private LocalDateTime currentSessionStartedAt;

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
  private VoiceChannel(Long workspaceId, User creator, String name, String description) {
    this.workspaceId = workspaceId;
    this.creator = creator;
    this.name = name;
    this.description = description;
    this.isDeleted = false;
  }

  // 보이스 채널을 논리 삭제한다.
  public void delete() {
    this.isDeleted = true;
  }

  public void startCurrentSession(LocalDateTime startedAt) {
    this.currentSessionStartedAt = startedAt;
  }

  public void endCurrentSession() {
    this.currentSessionStartedAt = null;
  }
}
