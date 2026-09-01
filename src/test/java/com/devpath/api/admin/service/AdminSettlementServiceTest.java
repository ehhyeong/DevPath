package com.devpath.api.admin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.devpath.api.admin.dto.settlement.SettlementHoldRequest;
import com.devpath.domain.refund.repository.RefundRepository;
import com.devpath.domain.settlement.entity.Settlement;
import com.devpath.domain.settlement.entity.SettlementHold;
import com.devpath.domain.settlement.entity.SettlementStatus;
import com.devpath.domain.settlement.repository.SettlementHoldRepository;
import com.devpath.domain.settlement.repository.SettlementRepository;
import com.devpath.domain.system.service.SystemPolicyService;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AdminSettlementServiceTest {

  @Mock private SettlementRepository settlementRepository;
  @Mock private SettlementHoldRepository settlementHoldRepository;
  @Mock private RefundRepository refundRepository;
  @Mock private SystemPolicyService systemPolicyService;
  @InjectMocks private AdminSettlementService adminSettlementService;

  @Test
  void settlementCanBeHeldReleasedAndCompleted() {
    Settlement settlement =
        Settlement.builder()
            .instructorId(2L)
            .learnerId(3L)
            .courseId(4L)
            .grossAmount(10000L)
            .feeAmount(1500L)
            .amount(8500L)
            .purchasedAt(LocalDateTime.now())
            .build();
    ReflectionTestUtils.setField(settlement, "id", 1L);
    SettlementHold hold =
        SettlementHold.builder().settlementId(1L).adminId(10L).reason("환불 검토").build();
    when(settlementRepository.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(settlement));
    when(settlementHoldRepository.save(any(SettlementHold.class))).thenReturn(hold);
    when(settlementHoldRepository.findTopBySettlementIdAndReleasedAtIsNullOrderByHeldAtDesc(1L))
        .thenReturn(Optional.of(hold));

    adminSettlementService.holdSettlement(1L, 10L, holdRequest("환불 검토"));
    assertThat(settlement.getStatus()).isEqualTo(SettlementStatus.HELD);

    adminSettlementService.releaseSettlement(1L, 11L, holdRequest("검토 완료"));
    assertThat(settlement.getStatus()).isEqualTo(SettlementStatus.PENDING);
    assertThat(hold.getReleasedBy()).isEqualTo(11L);
    assertThat(hold.getReleaseReason()).isEqualTo("검토 완료");

    adminSettlementService.completeSettlement(1L);
    assertThat(settlement.getStatus()).isEqualTo(SettlementStatus.COMPLETED);
    assertThat(settlement.getSettledAt()).isNotNull();
  }

  private SettlementHoldRequest holdRequest(String reason) {
    try {
      var constructor = SettlementHoldRequest.class.getDeclaredConstructor();
      constructor.setAccessible(true);
      SettlementHoldRequest request = constructor.newInstance();
      ReflectionTestUtils.setField(request, "reason", reason);
      return request;
    } catch (ReflectiveOperationException exception) {
      throw new IllegalStateException(exception);
    }
  }
}
