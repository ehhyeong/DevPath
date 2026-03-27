package com.devpath.api.instructor.repository;

import com.devpath.api.instructor.entity.Promotion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PromotionRepository extends JpaRepository<Promotion, Long> {

    List<Promotion> findByInstructorIdAndIsDeletedFalse(Long instructorId);

    Optional<Promotion> findByIdAndIsDeletedFalse(Long id);
}