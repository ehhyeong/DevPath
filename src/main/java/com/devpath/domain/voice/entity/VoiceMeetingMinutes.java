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
@Table(name = "voice_meeting_minutes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VoiceMeetingMinutes {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "voice_meeting_minutes_id")
  private Long id;

  @OneToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "voice_channel_id", nullable = false, unique = true)
  private VoiceChannel channel;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "updated_by_user_id", nullable = false)
  private User updatedBy;

  @Column(nullable = false)
  private Boolean recording;

  @Column(columnDefinition = "TEXT")
  private String transcript;

  @Column(columnDefinition = "TEXT")
  private String summary;

  @Column(name = "is_deleted", nullable = false)
  private Boolean isDeleted;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @Builder
  private VoiceMeetingMinutes(VoiceChannel channel, User updatedBy) {
    this.channel = channel;
    this.updatedBy = updatedBy;
    this.recording = false;
    this.transcript = "";
    this.summary = "";
    this.isDeleted = false;
  }

  public void update(User updatedBy, Boolean recording, String transcript, String summary) {
    this.updatedBy = updatedBy;
    if (recording != null) {
      this.recording = recording;
    }
    if (transcript != null) {
      this.transcript = transcript;
    }
    if (summary != null) {
      this.summary = summary;
    }
  }

  public void appendTranscript(User updatedBy, String line, int maxLength) {
    String normalizedLine = line == null ? "" : line.trim();

    if (normalizedLine.isBlank()) {
      return;
    }

    this.updatedBy = updatedBy;

    String current = transcript == null ? "" : transcript.trim();
    String next = current.isBlank() ? normalizedLine : current + "\n" + normalizedLine;

    if (maxLength > 0 && next.length() > maxLength) {
      next = next.substring(next.length() - maxLength).stripLeading();
    }

    this.transcript = next;
  }

  public void reset(User updatedBy) {
    this.updatedBy = updatedBy;
    this.recording = false;
    this.transcript = "";
    this.summary = "";
  }

  public void delete() {
    this.isDeleted = true;
  }
}
