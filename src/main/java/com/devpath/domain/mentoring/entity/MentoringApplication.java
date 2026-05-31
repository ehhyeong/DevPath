package com.devpath.domain.mentoring.entity;

import com.devpath.domain.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "mentoring_applications")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MentoringApplication {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "mentoring_application_id")
  private Long id;

  // 어떤 멘토링 공고에 신청했는지 연결한다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "mentoring_post_id", nullable = false)
  private MentoringPost post;

  // 신청자인 학습자 또는 팀 대표 사용자를 연결한다.
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "applicant_id", nullable = false)
  private User applicant;

  // 신청 동기와 자기소개 내용을 저장한다.
  @Column(nullable = false, columnDefinition = "TEXT")
  private String message;

  @Column(name = "desired_position", length = 80)
  private String desiredPosition;

  // 신청 처리 상태를 enum으로 고정한다.
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private MentoringApplicationStatus status;

  // 거절 시 멘토가 작성한 사유를 저장한다.
  @Column(name = "reject_reason", length = 500)
  private String rejectReason;

  // 승인 또는 거절 처리된 시간을 저장한다.
  @Column(name = "processed_at")
  private LocalDateTime processedAt;

  // 신청 내역도 추후 운영 정책을 위해 Soft Delete 가능하게 둔다.
  @Column(name = "is_deleted", nullable = false)
  private Boolean isDeleted;

  // 최초 신청 시간을 자동 기록한다.
  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  // 마지막 수정 시간을 자동 기록한다.
  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @Builder
  private MentoringApplication(
      MentoringPost post, User applicant, String message, String desiredPosition) {
    this.post = post;
    this.applicant = applicant;
    this.message = message;
    this.desiredPosition = normalizeDesiredPosition(desiredPosition);
    this.status = MentoringApplicationStatus.PENDING;
    this.isDeleted = false;
  }

  // 아직 처리되지 않은 신청인지 확인한다.
  public boolean isPending() {
    return this.status == MentoringApplicationStatus.PENDING;
  }

  // 신청을 승인 상태로 변경한다.
  public void approve() {
    this.status = MentoringApplicationStatus.APPROVED;
    this.processedAt = LocalDateTime.now();
    this.rejectReason = null;
  }

  // 신청을 거절 상태로 변경하고 거절 사유를 저장한다.
  public void reject(String rejectReason) {
    this.status = MentoringApplicationStatus.REJECTED;
    this.rejectReason = rejectReason;
    this.processedAt = LocalDateTime.now();
  }

  // 신청 내역을 논리 삭제한다.
  public void delete() {
    this.isDeleted = true;
  }

  private static String normalizeDesiredPosition(String desiredPosition) {
    if (desiredPosition == null || desiredPosition.isBlank()) {
      return null;
    }
    return desiredPosition.trim();
  }
}
