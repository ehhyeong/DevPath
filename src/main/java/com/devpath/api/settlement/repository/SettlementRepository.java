package com.devpath.api.settlement.repository;

import com.devpath.api.settlement.entity.Settlement;
import com.devpath.api.settlement.entity.SettlementStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {

    List<Settlement> findByInstructorIdAndIsDeletedFalse(Long instructorId);

    List<Settlement> findByInstructorIdAndIsDeletedFalseOrderByCreatedAtDesc(Long instructorId);

    Optional<Settlement> findByIdAndIsDeletedFalse(Long id);

    long countByInstructorIdAndStatusAndIsDeletedFalse(Long instructorId, SettlementStatus status);
}
