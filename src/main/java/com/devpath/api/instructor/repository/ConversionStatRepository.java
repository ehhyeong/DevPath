package com.devpath.api.instructor.repository;

import com.devpath.api.instructor.entity.ConversionStat;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConversionStatRepository extends JpaRepository<ConversionStat, Long> {

    Optional<ConversionStat> findTopByInstructorIdOrderByCalculatedAtDesc(Long instructorId);
}
