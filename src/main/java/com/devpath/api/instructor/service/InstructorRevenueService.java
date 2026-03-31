package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.revenue.RevenueResponse;
import com.devpath.api.instructor.dto.revenue.SettlementResponse;
import com.devpath.api.settlement.entity.Settlement;
import com.devpath.api.settlement.entity.SettlementStatus;
import com.devpath.api.settlement.repository.SettlementRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstructorRevenueService {

    private static final double PLATFORM_FEE_RATE = 0.2;

    private final SettlementRepository settlementRepository;

    public RevenueResponse getRevenue(Long instructorId) {
        List<Settlement> settlements = settlementRepository.findByInstructorIdAndIsDeletedFalseOrderByCreatedAtDesc(
                instructorId
        );

        long totalRevenue = settlements.stream()
                .mapToLong(Settlement::getAmount)
                .sum();

        LocalDateTime startOfMonth = LocalDateTime.now()
                .withDayOfMonth(1)
                .withHour(0)
                .withMinute(0)
                .withSecond(0)
                .withNano(0);

        long monthlyRevenue = settlements.stream()
                .filter(settlement -> settlement.getSettledAt() != null
                        && !settlement.getSettledAt().isBefore(startOfMonth))
                .mapToLong(Settlement::getAmount)
                .sum();

        long completedRevenue = settlements.stream()
                .filter(settlement -> settlement.getStatus() == SettlementStatus.COMPLETED)
                .mapToLong(Settlement::getAmount)
                .sum();

        long pendingSettlementAmount = settlements.stream()
                .filter(settlement -> settlement.getStatus() == SettlementStatus.PENDING)
                .mapToLong(Settlement::getAmount)
                .sum();

        long heldSettlementAmount = settlements.stream()
                .filter(settlement -> settlement.getStatus() == SettlementStatus.HELD)
                .mapToLong(Settlement::getAmount)
                .sum();

        long netRevenue = Math.round(completedRevenue * (1 - PLATFORM_FEE_RATE));

        List<RevenueResponse.TransactionItem> recentTransactions = settlements.stream()
                .limit(10)
                .map(settlement -> RevenueResponse.TransactionItem.builder()
                        .settlementId(settlement.getId())
                        .amount(settlement.getAmount())
                        .settledAt(settlement.getSettledAt())
                        .status(settlement.getStatus().name())
                        .build())
                .toList();

        return RevenueResponse.builder()
                .totalRevenue(totalRevenue)
                .monthlyRevenue(monthlyRevenue)
                .platformFeeRate(PLATFORM_FEE_RATE)
                .netRevenue(netRevenue)
                .pendingSettlementCount(
                        settlementRepository.countByInstructorIdAndStatusAndIsDeletedFalse(
                                instructorId,
                                SettlementStatus.PENDING
                        )
                )
                .heldSettlementCount(
                        settlementRepository.countByInstructorIdAndStatusAndIsDeletedFalse(
                                instructorId,
                                SettlementStatus.HELD
                        )
                )
                .completedSettlementCount(
                        settlementRepository.countByInstructorIdAndStatusAndIsDeletedFalse(
                                instructorId,
                                SettlementStatus.COMPLETED
                        )
                )
                .pendingSettlementAmount(pendingSettlementAmount)
                .heldSettlementAmount(heldSettlementAmount)
                .recentTransactions(recentTransactions)
                .build();
    }

    public List<SettlementResponse> getSettlements(Long instructorId) {
        return settlementRepository.findByInstructorIdAndIsDeletedFalseOrderByCreatedAtDesc(instructorId)
                .stream()
                .map(SettlementResponse::from)
                .toList();
    }
}
