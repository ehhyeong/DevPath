package com.devpath.domain.notification.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "instructor_notification")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@EntityListeners(AuditingEntityListener.class)
public class InstructorNotification {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private Long instructorId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private InstructorNotificationType type;

  @Column(nullable = false)
  private String message;

  @Builder.Default
  @Column(name = "is_read", nullable = false)
  private Boolean isRead = false;

  @CreatedDate private LocalDateTime createdAt;

  // 알림 읽음 상태를 명시적으로 변경한다.
  public void markAsRead() {
    this.isRead = true;
  }
}
