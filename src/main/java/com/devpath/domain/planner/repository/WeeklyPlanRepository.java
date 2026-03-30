package com.devpath.domain.planner.repository;

import com.devpath.domain.planner.entity.WeeklyPlan;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WeeklyPlanRepository extends JpaRepository<WeeklyPlan, Long> {

    List<WeeklyPlan> findAllByLearnerIdOrderByCreatedAtDesc(Long learnerId);

    Optional<WeeklyPlan> findByIdAndLearnerId(Long planId, Long learnerId);
}
