package com.devpath.domain.planner.repository;

import com.devpath.domain.planner.entity.Streak;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StreakRepository extends JpaRepository<Streak, Long> {

  Optional<Streak> findByLearnerId(Long learnerId);

  List<Streak> findAllByLearnerIdIn(Collection<Long> learnerIds);
}
