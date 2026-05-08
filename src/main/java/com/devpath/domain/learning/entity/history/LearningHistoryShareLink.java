package com.devpath.domain.learning.entity.history;

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
@Table(name = "learning_history_share_links")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LearningHistoryShareLink {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "learning_history_share_link_id")
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Column(name = "share_token", nullable = false, unique = true, length = 100)
  private String shareToken;

  @Column(name = "title", length = 200)
  private String title;

  @Column(name = "expires_at")
  private LocalDateTime expiresAt;

  @Column(name = "access_count", nullable = false)
  private Long accessCount;

  @Column(name = "is_active", nullable = false)
  private Boolean isActive;

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @Builder
  public LearningHistoryShareLink(
      User user,
      String shareToken,
      String title,
      LocalDateTime expiresAt,
      Long accessCount,
      Boolean isActive) {
    this.user = user;
    this.shareToken = shareToken;
    this.title = title;
    this.expiresAt = expiresAt;
    this.accessCount = accessCount == null ? 0L : accessCount;
    this.isActive = isActive == null ? true : isActive;
  }

  public void increaseAccessCount() {
    this.accessCount += 1L;
  }

  public void deactivate() {
    this.isActive = false;
  }

  public boolean isExpired() {
    return this.expiresAt != null && this.expiresAt.isBefore(LocalDateTime.now());
  }
}
