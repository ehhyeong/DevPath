package com.devpath.domain.resume.repository;

import com.devpath.domain.resume.entity.CareerProfileSkill;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CareerProfileSkillRepository extends JpaRepository<CareerProfileSkill, Long> {

  @EntityGraph(attributePaths = "careerProfile")
  List<CareerProfileSkill> findAllByCareerProfile_IdAndIsDeletedFalseOrderByNameAsc(Long profileId);

  boolean existsByCareerProfile_IdAndNameIgnoreCaseAndIsDeletedFalse(Long profileId, String name);
}
