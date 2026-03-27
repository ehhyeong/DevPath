package com.devpath.api.instructor.repository;

import com.devpath.api.instructor.entity.ReviewTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReviewTemplateRepository extends JpaRepository<ReviewTemplate, Long> {

    List<ReviewTemplate> findByInstructorIdAndIsDeletedFalse(Long instructorId);

    Optional<ReviewTemplate> findByIdAndIsDeletedFalse(Long id);
}