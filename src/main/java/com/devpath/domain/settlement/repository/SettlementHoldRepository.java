package com.devpath.domain.settlement.repository;

import com.devpath.domain.settlement.entity.SettlementHold;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SettlementHoldRepository extends JpaRepository<SettlementHold, Long> {

  List<SettlementHold> findAllBySettlementIdOrderByHeldAtDesc(Long settlementId);

  Optional<SettlementHold> findTopBySettlementIdAndReleasedAtIsNullOrderByHeldAtDesc(
      Long settlementId);
}
