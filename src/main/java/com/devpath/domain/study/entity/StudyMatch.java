package com.devpath.domain.study.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "study_match")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class StudyMatch {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "requester_id", nullable = false)
  private Long requesterId; // 매칭을 요청한 사람

  @Column(name = "receiver_id", nullable = false)
  private Long receiverId; // 매칭 요청을 받은 사람

  @Column(name = "node_id", nullable = false)
  private Long nodeId; // 어떤 노드를 같이 듣다가 매칭되었는지

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private StudyMatchStatus status;

  @Column(name = "created_at", updatable = false)
  private LocalDateTime createdAt;

  @PrePersist
  protected void onCreate() {
    this.createdAt = LocalDateTime.now();
  }

  // 상태 변경 비즈니스 메서드
  public void acceptMatch() {
    this.status = StudyMatchStatus.ACCEPTED;
  }

  public void declineMatch() {
    this.status = StudyMatchStatus.DECLINED;
  }
}
