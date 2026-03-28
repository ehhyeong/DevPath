package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.settlement.SettlementEligibilityResponse;
import com.devpath.api.admin.dto.settlement.SettlementHoldRequest;
import com.devpath.api.refund.entity.RefundRequest;
import com.devpath.api.refund.repository.RefundRepository;
import com.devpath.api.settlement.entity.Settlement;
import com.devpath.api.settlement.repository.SettlementRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminSettlementService {

    private final SettlementRepository settlementRepository;
    private final RefundRepository refundRepository;

    public void holdSettlement(Long settlementId, Long adminId, SettlementHoldRequest request) {
        Settlement settlement = settlementRepository.findByIdAndIsDeletedFalse(settlementId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
        settlement.hold();
    }

    @Transactional(readOnly = true)
    public SettlementEligibilityResponse checkEligibility(Long refundRequestId) {
        RefundRequest refundRequest = refundRepository.findByIdAndIsDeletedFalse(refundRequestId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

        LocalDateTime purchasedAt = refundRequest.getRequestedAt();
        LocalDateTime refundDeadline = purchasedAt.plusDays(7);
        LocalDateTime now = LocalDateTime.now();
        boolean isEligible = now.isBefore(refundDeadline);
        long remainingDays = Math.max(0, ChronoUnit.DAYS.between(now, refundDeadline));

        return SettlementEligibilityResponse.builder()
                .refundRequestId(refundRequestId)
                .courseId(refundRequest.getCourseId())
                .learnerId(refundRequest.getLearnerId())
                .purchasedAt(purchasedAt)
                .refundDeadline(refundDeadline)
                .isEligible(isEligible)
                .remainingDays(remainingDays)
                .build();
    }
}