package com.devpath.domain.voice.entity;

import com.devpath.domain.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(
    name = "voice_chat_clear_states",
    uniqueConstraints = {
      @UniqueConstraint(
          name = "uk_voice_chat_clear_state_channel_user",
          columnNames = {"voice_channel_id", "user_id"})
    },
    indexes = {
      @Index(
          name = "idx_voice_chat_clear_state_channel_user",
          columnList = "voice_channel_id, user_id")
    })
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VoiceChatClearState {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "voice_chat_clear_state_id")
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "voice_channel_id", nullable = false)
  private VoiceChannel channel;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Column(name = "cleared_at", nullable = false)
  private LocalDateTime clearedAt;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @Builder
  private VoiceChatClearState(VoiceChannel channel, User user, LocalDateTime clearedAt) {
    this.channel = channel;
    this.user = user;
    this.clearedAt = clearedAt;
  }

  public void clearAt(LocalDateTime clearedAt) {
    this.clearedAt = clearedAt;
  }
}
