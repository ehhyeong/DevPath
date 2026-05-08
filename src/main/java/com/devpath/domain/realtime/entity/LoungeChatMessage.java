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
@Table(name = "lounge_chat_messages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LoungeChatMessage {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "lounge_chat_message_id")
  private Long id;

  // A 담당 라운지/워크스페이스 Entity와 충돌을 줄이기 위해 ID만 느슨하게 참조한다.
  @Column(name = "lounge_id", nullable = false)
  private Long loungeId;

  // 메시지를 보낸 사용자다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "sender_id", nullable = false)
  private User sender;

  // 라운지 채팅 메시지 본문이다.
  @Column(nullable = false, columnDefinition = "TEXT")
  private String content;

  // 채팅 이력 보존을 위해 물리 삭제 대신 논리 삭제를 사용한다.
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
  private LoungeChatMessage(Long loungeId, User sender, String content) {
    this.loungeId = loungeId;
    this.sender = sender;
    this.content = content;
    this.isDeleted = false;
  }

  // 메시지를 논리 삭제한다.
  public void delete() {
    this.isDeleted = true;
  }
}
