package com.devpath.api.admin.repository;

import com.devpath.api.admin.entity.CourseReviewHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseReviewHistoryRepository extends JpaRepository<CourseReviewHistory, Long> {

  List<CourseReviewHistory> findAllByOrderByProcessedAtDesc();

  List<CourseReviewHistory> findAllByCourseIdOrderByProcessedAtDesc(Long courseId);
}
