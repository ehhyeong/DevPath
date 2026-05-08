package com.devpath.api.instructor.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(
    name = "instructor_subscription",
    uniqueConstraints = {
      @UniqueConstraint(
          name = "uk_instructor_subscription_channel_learner",
          columnNames = {"channel_id", "learner_id"})
    })
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@EntityListeners(AuditingEntityListener.class)
public class InstructorSubscription {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "channel_id", nullable = false)
  private Long channelId;

  @Column(name = "learner_id", nullable = false)
  private Long learnerId;

  @Builder.Default
  @Column(name = "notification_enabled", nullable = false)
  private boolean notificationEnabled = true;

  @Builder.Default
  @Column(name = "is_deleted", nullable = false)
  private Boolean isDeleted = false;

  @CreatedDate
  @Column(name = "subscribed_at", updatable = false)
  private LocalDateTime subscribedAt;

  public void updateNotification(boolean notificationEnabled) {
    this.notificationEnabled = notificationEnabled;
  }

  // Keep the row for re-subscribe flows instead of deleting it.
  public void unsubscribe() {
    this.isDeleted = true;
    this.notificationEnabled = false;
  }

  public void resubscribe() {
    this.isDeleted = false;
    this.notificationEnabled = true;
  }
}
