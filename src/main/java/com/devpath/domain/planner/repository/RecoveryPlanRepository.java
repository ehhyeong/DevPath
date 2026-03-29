package com.devpath.domain.planner.repository;

import com.devpath.domain.planner.entity.RecoveryPlan;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecoveryPlanRepository extends JpaRepository<RecoveryPlan, Long> {
}