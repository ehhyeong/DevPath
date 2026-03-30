package com.devpath.api.instructor.repository;

import com.devpath.api.instructor.entity.ReviewReport;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewReportRepository extends JpaRepository<ReviewReport, Long> {

    List<ReviewReport> findAllByReviewIdAndIsResolvedFalse(Long reviewId);
}
