package com.devpath.api.settlement.service;

import com.devpath.api.settlement.dto.SettlementEligibilityResponse;
import com.devpath.api.settlement.dto.SettlementHoldRequest;
import com.devpath.api.settlement.dto.SettlementResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.refund.entity.RefundRequest;
import com.devpath.domain.refund.entity.RefundStatus;
import com.devpath.domain.refund.repository.RefundRepository;
import com.devpath.domain.settlement.entity.Settlement;
import com.devpath.domain.settlement.entity.SettlementHold;
import com.devpath.domain.settlement.entity.SettlementStatus;
import com.devpath.domain.settlement.repository.SettlementHoldRepository;
import com.devpath.domain.settlement.repository.SettlementRepository;
import com.devpath.domain.system.service.SystemPolicyService;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminSettlementService {

  private static final int MAX_REFUNDABLE_PROGRESS_PERCENT = 30;

  private final SettlementRepository settlementRepository;
  private final SettlementHoldRepository settlementHoldRepository;
  private final RefundRepository refundRepository;
  private final SystemPolicyService systemPolicyService;

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

  public void releaseSettlement(Long settlementId, Long adminId, SettlementHoldRequest request) {
    Settlement settlement = getSettlement(settlementId);
    settlement.release();
    settlementHoldRepository
        .findTopBySettlementIdAndReleasedAtIsNullOrderByHeldAtDesc(settlementId)
        .ifPresent(hold -> hold.release(adminId, request.getReason()));
  }

  public void completeSettlement(Long settlementId) {
    getSettlement(settlementId).complete();
  }

  @Transactional(readOnly = true)
  public List<SettlementResponse> getSettlements() {
    return settlementRepository.findAllByIsDeletedFalseOrderByCreatedAtDesc().stream()
        .map(SettlementResponse::from)
        .toList();
  }

  @Transactional(readOnly = true)
  public SettlementResponse getSettlementDetail(Long settlementId) {
    return SettlementResponse.from(getSettlement(settlementId));
  }

  @Transactional(readOnly = true)
  public SettlementEligibilityResponse checkEligibility(Long refundRequestId) {
    RefundRequest refundRequest =
        refundRepository
            .findByIdAndIsDeletedFalse(refundRequestId)
            .orElseThrow(() -> new CustomException(ErrorCode.REFUND_NOT_FOUND));

    LocalDateTime purchasedAt = refundRequest.getEnrolledAt();
    LocalDateTime refundDeadline =
        purchasedAt.plusDays(systemPolicyService.currentPolicy().refundPolicyDays());
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

  private Settlement getSettlement(Long settlementId) {
    return settlementRepository
        .findByIdAndIsDeletedFalse(settlementId)
        .orElseThrow(() -> new CustomException(ErrorCode.SETTLEMENT_NOT_FOUND));
  }
}
