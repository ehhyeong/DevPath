package com.devpath.domain.admin.repository;

import com.devpath.domain.admin.entity.CourseReviewHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseReviewHistoryRepository extends JpaRepository<CourseReviewHistory, Long> {

  List<CourseReviewHistory> findAllByOrderByProcessedAtDesc();

  List<CourseReviewHistory> findAllByCourseIdOrderByProcessedAtDesc(Long courseId);
}
