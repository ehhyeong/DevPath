package com.devpath.domain.resume.repository;

import com.devpath.domain.resume.entity.CareerProfileSnapshot;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CareerProfileSnapshotRepository
    extends JpaRepository<CareerProfileSnapshot, Long> {

  @EntityGraph(attributePaths = "careerProfile")
  List<CareerProfileSnapshot> findAllByCareerProfile_IdOrderByCreatedAtDesc(Long profileId);
}
