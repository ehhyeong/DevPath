package com.devpath.domain.analytics;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ExperimentResultRepository extends JpaRepository<ExperimentResult, Long> {

  Optional<ExperimentResult> findByExperimentId(String experimentId);
}
