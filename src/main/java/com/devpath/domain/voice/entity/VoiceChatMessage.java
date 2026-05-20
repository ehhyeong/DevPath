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
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(
    name = "voice_chat_messages",
    indexes = {
      @Index(name = "idx_voice_chat_messages_channel_created", columnList = "voice_channel_id, created_at")
    })
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VoiceChatMessage {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "voice_chat_message_id")
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "voice_channel_id", nullable = false)
  private VoiceChannel channel;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "sender_id", nullable = false)
  private User sender;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String content;

  @Column(name = "is_deleted", nullable = false)
  private Boolean isDeleted;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @Builder
  private VoiceChatMessage(VoiceChannel channel, User sender, String content) {
    this.channel = channel;
    this.sender = sender;
    this.content = content;
    this.isDeleted = false;
  }

  public void delete() {
    this.isDeleted = true;
  }
}
