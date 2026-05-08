package com.devpath.domain.planner.repository;

import com.devpath.domain.planner.entity.LearnerGoal;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearnerGoalRepository extends JpaRepository<LearnerGoal, Long> {

  List<LearnerGoal> findAllByLearnerIdAndIsActiveTrue(Long learnerId);

  List<LearnerGoal> findAllByLearnerIdInAndIsActiveTrue(Collection<Long> learnerIds);
}
