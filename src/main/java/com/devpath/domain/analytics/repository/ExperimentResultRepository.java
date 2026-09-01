package com.devpath.domain.analytics.repository;

import com.devpath.domain.analytics.entity.ExperimentResult;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ExperimentResultRepository extends JpaRepository<ExperimentResult, Long> {

  Optional<ExperimentResult> findByExperimentId(String experimentId);

  boolean existsByExperimentId(String experimentId);

  java.util.List<ExperimentResult> findAllByOrderByCreatedAtDescIdDesc();
}
