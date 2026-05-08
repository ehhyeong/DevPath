package com.devpath.domain.resume.repository;

import com.devpath.domain.resume.entity.CareerProfileProofCard;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CareerProfileProofCardRepository
    extends JpaRepository<CareerProfileProofCard, Long> {

  @EntityGraph(attributePaths = "careerProfile")
  List<CareerProfileProofCard> findAllByCareerProfile_IdAndIsDeletedFalseOrderByCreatedAtDesc(
      Long profileId);

  boolean existsByCareerProfile_IdAndProofCardIdAndIsDeletedFalse(Long profileId, Long proofCardId);

  Optional<CareerProfileProofCard> findByCareerProfile_IdAndProofCardIdAndIsDeletedFalse(
      Long profileId, Long proofCardId);
}
