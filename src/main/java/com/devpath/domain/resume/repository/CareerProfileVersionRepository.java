package com.devpath.domain.resume.repository;

import com.devpath.domain.resume.entity.CareerProfileVersion;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CareerProfileVersionRepository extends JpaRepository<CareerProfileVersion, Long> {

  @EntityGraph(attributePaths = {"careerProfile", "snapshot"})
  List<CareerProfileVersion> findAllByCareerProfile_IdOrderByVersionNumberDesc(Long profileId);

  long countByCareerProfile_Id(Long profileId);
}
