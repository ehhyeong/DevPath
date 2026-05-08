package com.devpath.domain.learning.repository.analytics;

import com.devpath.domain.learning.entity.analytics.AnalyticsMetricType;
import com.devpath.domain.learning.entity.analytics.LearningMetricSample;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearningMetricSampleRepository extends JpaRepository<LearningMetricSample, Long> {

  List<LearningMetricSample> findTop50ByCourseInstructorIdOrderBySampledAtDesc(Long instructorId);

  List<LearningMetricSample> findTop50ByMetricTypeOrderBySampledAtDesc(
      AnalyticsMetricType metricType);
}
