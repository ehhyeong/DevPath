package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.revenue.RevenueResponse;
import com.devpath.api.instructor.dto.revenue.SettlementResponse;
import com.devpath.api.settlement.entity.Settlement;
import com.devpath.api.settlement.entity.SettlementStatus;
import com.devpath.api.settlement.repository.SettlementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstructorRevenueService {

    private static final double PLATFORM_FEE_RATE = 0.2;

    private final SettlementRepository settlementRepository;

    public RevenueResponse getRevenue(Long instructorId) {
        List<Settlement> settlements = settlementRepository.findByInstructorIdAndIsDeletedFalse(instructorId);

        long totalRevenue = settlements.stream()
                .mapToLong(Settlement::getAmount)
                .sum();

        LocalDateTime startOfMonth = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        long monthlyRevenue = settlements.stream()
                .filter(s -> s.getSettledAt() != null && s.getSettledAt().isAfter(startOfMonth))
                .mapToLong(Settlement::getAmount)
                .sum();

        long completedRevenue = settlements.stream()
                .filter(s -> s.getStatus() == SettlementStatus.COMPLETED)
                .mapToLong(Settlement::getAmount)
                .sum();
        long netRevenue = Math.round(completedRevenue * (1 - PLATFORM_FEE_RATE));

        List<RevenueResponse.TransactionItem> recentTransactions = settlements.stream()
                .map(s -> RevenueResponse.TransactionItem.builder()
                        .courseId(null)
                        .amount(s.getAmount())
                        .settledAt(s.getSettledAt())
                        .status(s.getStatus().name())
                        .build())
                .collect(Collectors.toList());

        return RevenueResponse.builder()
                .totalRevenue(totalRevenue)
                .monthlyRevenue(monthlyRevenue)
                .platformFeeRate(PLATFORM_FEE_RATE)
                .netRevenue(netRevenue)
                .recentTransactions(recentTransactions)
                .build();
    }

    public List<SettlementResponse> getSettlements(Long instructorId) {
        return settlementRepository.findByInstructorIdAndIsDeletedFalse(instructorId).stream()
                .map(SettlementResponse::from)
                .collect(Collectors.toList());
    }
}