package com.devpath.domain.resume.repository;

import com.devpath.domain.resume.entity.CareerProfileProject;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CareerProfileProjectRepository extends JpaRepository<CareerProfileProject, Long> {

  @EntityGraph(attributePaths = "careerProfile")
  List<CareerProfileProject> findAllByCareerProfile_IdAndIsDeletedFalseOrderByCreatedAtDesc(
      Long profileId);
}
