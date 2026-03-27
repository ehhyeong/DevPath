package com.devpath.api.settlement.repository;

import com.devpath.api.settlement.entity.Settlement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {

    List<Settlement> findByInstructorIdAndIsDeletedFalse(Long instructorId);

    Optional<Settlement> findByIdAndIsDeletedFalse(Long id);
}