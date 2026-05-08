package com.devpath.api.instructor.repository;

import com.devpath.api.instructor.entity.Promotion;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PromotionRepository extends JpaRepository<Promotion, Long> {

  List<Promotion> findByInstructorIdAndIsDeletedFalse(Long instructorId);

  Optional<Promotion> findByIdAndIsDeletedFalse(Long id);

  Optional<Promotion> findTopByCourseIdAndInstructorIdAndIsDeletedFalseOrderByCreatedAtDesc(
      Long courseId, Long instructorId);
}
