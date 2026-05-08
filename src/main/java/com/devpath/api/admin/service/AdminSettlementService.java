package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.settlement.SettlementEligibilityResponse;
import com.devpath.api.admin.dto.settlement.SettlementHoldRequest;
import com.devpath.api.refund.entity.RefundRequest;
import com.devpath.api.refund.entity.RefundStatus;
import com.devpath.api.refund.repository.RefundRepository;
import com.devpath.api.settlement.entity.Settlement;
import com.devpath.api.settlement.entity.SettlementHold;
import com.devpath.api.settlement.entity.SettlementStatus;
import com.devpath.api.settlement.repository.SettlementHoldRepository;
import com.devpath.api.settlement.repository.SettlementRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminSettlementService {

  private static final long REFUND_AVAILABLE_DAYS = 7L;
  private static final int MAX_REFUNDABLE_PROGRESS_PERCENT = 30;

  private final SettlementRepository settlementRepository;
  private final SettlementHoldRepository settlementHoldRepository;
  private final RefundRepository refundRepository;

  public void holdSettlement(Long settlementId, Long adminId, SettlementHoldRequest request) {
    Settlement settlement =
        settlementRepository
            .findByIdAndIsDeletedFalse(settlementId)
            .orElseThrow(() -> new CustomException(ErrorCode.SETTLEMENT_NOT_FOUND));

    settlement.hold();

    settlementHoldRepository.save(
        SettlementHold.builder()
            .settlementId(settlement.getId())
            .adminId(adminId)
            .reason(request.getReason())
            .build());
  }

  @Transactional(readOnly = true)
  public SettlementEligibilityResponse checkEligibility(Long refundRequestId) {
    RefundRequest refundRequest =
        refundRepository
            .findByIdAndIsDeletedFalse(refundRequestId)
            .orElseThrow(() -> new CustomException(ErrorCode.REFUND_NOT_FOUND));

    LocalDateTime purchasedAt = refundRequest.getEnrolledAt();
    LocalDateTime refundDeadline = purchasedAt.plusDays(REFUND_AVAILABLE_DAYS);
    LocalDateTime now = LocalDateTime.now();

    Integer progressPercent =
        refundRequest.getProgressPercentSnapshot() == null
            ? 0
            : refundRequest.getProgressPercentSnapshot();

    boolean withinRefundPeriod = !now.isAfter(refundDeadline);
    boolean progressEligible = progressPercent <= MAX_REFUNDABLE_PROGRESS_PERCENT;

    // 실제 환불 승인 가능 여부는 기간/진도율/PENDING 상태를 모두 만족해야 한다.
    boolean refundApprovable =
        refundRequest.getStatus() == RefundStatus.PENDING && withinRefundPeriod && progressEligible;

    Settlement pendingSettlement =
        settlementRepository
            .findTopByInstructorIdAndStatusAndIsDeletedFalseOrderByCreatedAtDesc(
                refundRequest.getInstructorId(), SettlementStatus.PENDING)
            .orElse(null);

    Settlement heldSettlement =
        settlementRepository
            .findTopByInstructorIdAndStatusAndIsDeletedFalseOrderByCreatedAtDesc(
                refundRequest.getInstructorId(), SettlementStatus.HELD)
            .orElse(null);

    boolean hasPendingSettlement = pendingSettlement != null;

    // HOLD만 있고 PENDING이 없으면 현재 차감 가능한 정산이 없는 상태로 본다.
    boolean holdBlocked = pendingSettlement == null && heldSettlement != null;

    // settlement eligibility는 read-only 계산이며 DB 상태를 바꾸지 않는다.
    boolean isEligible =
        refundRequest.getStatus() != RefundStatus.APPROVED
            && !refundApprovable
            && hasPendingSettlement
            && !holdBlocked;

    long remainingDays = Math.max(0, ChronoUnit.DAYS.between(now, refundDeadline));

    return SettlementEligibilityResponse.builder()
        .refundRequestId(refundRequestId)
        .courseId(refundRequest.getCourseId())
        .learnerId(refundRequest.getLearnerId())
        .instructorId(refundRequest.getInstructorId())
        .purchasedAt(purchasedAt)
        .refundDeadline(refundDeadline)
        .progressPercent(progressPercent)
        .refundAmount(refundRequest.getRefundAmount())
        .withinRefundPeriod(withinRefundPeriod)
        .progressEligible(progressEligible)
        .refundApprovable(refundApprovable)
        .holdBlocked(holdBlocked)
        .hasPendingSettlement(hasPendingSettlement)
        .candidateSettlementId(pendingSettlement == null ? null : pendingSettlement.getId())
        .candidateSettlementAmount(pendingSettlement == null ? 0L : pendingSettlement.getAmount())
        .isEligible(isEligible)
        .remainingDays(remainingDays)
        .build();
  }
}
