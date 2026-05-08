package com.devpath.api.instructor.repository;

import com.devpath.api.instructor.entity.ConversionStat;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConversionStatRepository extends JpaRepository<ConversionStat, Long> {

  Optional<ConversionStat> findTopByInstructorIdAndCourseIdIsNullOrderByCalculatedAtDesc(
      Long instructorId);

  List<ConversionStat> findByInstructorIdAndCourseIdIsNotNullOrderByCalculatedAtDesc(
      Long instructorId);

  long countByInstructorIdAndCourseIdIsNullAndCalculatedAtAfter(
      Long instructorId, LocalDateTime calculatedAt);
}
