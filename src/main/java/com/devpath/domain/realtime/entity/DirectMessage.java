package com.devpath.domain.realtime.entity;

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
@Table(name = "direct_messages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DirectMessage {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "direct_message_id")
  private Long id;

  // 1:1 메시지를 보낸 사용자다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "sender_id", nullable = false)
  private User sender;

  // 1:1 메시지를 받은 사용자다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "receiver_id", nullable = false)
  private User receiver;

  // 1:1 메시지 본문이다.
  @Column(nullable = false, columnDefinition = "TEXT")
  private String content;

  // 메시지 이력 보존을 위해 물리 삭제 대신 논리 삭제를 사용한다.
  @Column(name = "is_deleted", nullable = false)
  private Boolean isDeleted;

  // 최초 작성 시간을 자동 기록한다.
  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  // 마지막 수정 시간을 자동 기록한다.
  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @Builder
  private DirectMessage(User sender, User receiver, String content) {
    this.sender = sender;
    this.receiver = receiver;
    this.content = content;
    this.isDeleted = false;
  }

  // 메시지를 논리 삭제한다.
  public void delete() {
    this.isDeleted = true;
  }
}
