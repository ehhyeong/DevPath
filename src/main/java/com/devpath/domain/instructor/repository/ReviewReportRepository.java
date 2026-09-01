package com.devpath.domain.instructor.repository;

import com.devpath.domain.instructor.entity.ReviewReport;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewReportRepository extends JpaRepository<ReviewReport, Long> {

  List<ReviewReport> findAllByReviewIdAndIsResolvedFalse(Long reviewId);
}
