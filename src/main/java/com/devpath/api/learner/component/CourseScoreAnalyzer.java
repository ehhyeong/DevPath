package com.devpath.api.learner.component;

import com.devpath.api.learning.component.NodeScoreCollector;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.repository.CourseNodeMappingRepository;
import com.devpath.domain.course.repository.CourseRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

// 클리어한 노드와 연관된(노드에 매핑된) 강의들의 성취도(퀴즈/과제 점수 평균)를 산출한다.
@Component
@RequiredArgsConstructor
public class CourseScoreAnalyzer {

  private final CourseNodeMappingRepository courseNodeMappingRepository;
  private final CourseRepository courseRepository;
  private final NodeScoreCollector nodeScoreCollector;

  // 클리어 노드에 매핑된 강의별 성취도와 전체 평균을 계산한다.
  public CourseScores analyze(Long userId, Long clearedNodeId) {
    List<Long> courseIds = courseNodeMappingRepository.findCourseIdsByNodeId(clearedNodeId);
    List<CourseScore> perCourse = new ArrayList<>();

    for (Long courseId : courseIds) {
      List<Long> nodeIds = courseNodeMappingRepository.findNodeIdsByCourseId(courseId);
      List<BigDecimal> scores = nodeScoreCollector.collectScores(nodeIds, userId);
      if (scores.isEmpty()) {
        continue;
      }

      double average = scores.stream().mapToDouble(BigDecimal::doubleValue).average().orElse(0.0);
      String courseTitle = courseRepository.findById(courseId).map(Course::getTitle).orElse("강좌");
      perCourse.add(new CourseScore(courseTitle, (int) Math.round(average)));
    }

    boolean hasData = !perCourse.isEmpty();
    double overall =
        hasData ? perCourse.stream().mapToInt(CourseScore::percent).average().orElse(0.0) : 0.0;
    return new CourseScores(perCourse, overall, hasData);
  }

  // 강의 1건의 성취도다.
  public record CourseScore(String courseName, int percent) {}

  // 강의별 성취도 묶음이다. hasData=false면 점수 근거가 없는 상태다.
  public record CourseScores(List<CourseScore> perCourse, double average, boolean hasData) {}
}