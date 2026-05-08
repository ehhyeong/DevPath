package com.devpath.domain.resume.repository;

import com.devpath.domain.resume.entity.CareerProfile;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CareerProfileRepository extends JpaRepository<CareerProfile, Long> {

  boolean existsByUser_IdAndIsDeletedFalse(Long userId);

  @EntityGraph(attributePaths = "user")
  Optional<CareerProfile> findByUser_IdAndIsDeletedFalse(Long userId);

  @EntityGraph(attributePaths = "user")
  Optional<CareerProfile> findByIdAndIsDeletedFalse(Long id);
}
