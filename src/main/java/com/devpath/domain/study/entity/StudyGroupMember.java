package com.devpath.domain.study.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "study_group_member")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class StudyGroupMember {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  // 무조건 지연 로딩 (LAZY)
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "group_id", nullable = false)
  private StudyGroup studyGroup;

  @Column(name = "learner_id", nullable = false)
  private Long learnerId; // Users 테이블의 ID 참조 (MSA/모듈 분리를 고려해 ID만 참조)

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private StudyGroupJoinStatus joinStatus;

  @Column(name = "joined_at")
  private LocalDateTime joinedAt;

  public void approveJoin() {
    this.joinStatus = StudyGroupJoinStatus.APPROVED;
    this.joinedAt = LocalDateTime.now();
  }

  public void rejectJoin() {
    this.joinStatus = StudyGroupJoinStatus.REJECTED;
  }
}
