package com.devpath.api.analytics.controller;

import com.devpath.api.analytics.dto.InstructorAnalyticsAssignmentResponse;
import com.devpath.api.analytics.dto.InstructorAnalyticsDifficultyResponse;
import com.devpath.api.analytics.dto.InstructorAnalyticsDropOffResponse;
import com.devpath.api.analytics.dto.InstructorAnalyticsFunnelResponse;
import com.devpath.api.analytics.dto.InstructorAnalyticsOverviewResponse;
import com.devpath.api.analytics.dto.InstructorAnalyticsProgressResponse;
import com.devpath.api.analytics.dto.InstructorAnalyticsQuizResponse;
import com.devpath.api.analytics.dto.InstructorAnalyticsStudentResponse;
import com.devpath.api.analytics.dto.InstructorAnalyticsWeakPointResponse;
import com.devpath.api.analytics.service.InstructorLearningAnalyticsService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "강사 - 학습 분석", description = "강사용 학습 분석 API")
@RestController
@RequestMapping("/api/instructor/analytics")
@RequiredArgsConstructor
public class InstructorLearningAnalyticsController {

  private final InstructorLearningAnalyticsService instructorLearningAnalyticsService;

  @Operation(summary = "학습 분석 개요 조회", description = "강사 전체 학습 분석 개요를 조회합니다.")
  @GetMapping("/overview")
  public ResponseEntity<ApiResponse<InstructorAnalyticsOverviewResponse.Detail>> getOverview(
      @Parameter(hidden = true) @AuthenticationPrincipal Long instructorId) {
    return ResponseEntity.ok(
        ApiResponse.ok(instructorLearningAnalyticsService.getOverview(instructorId)));
  }

  @Operation(summary = "수강생 분석 조회", description = "강사 강의 전체의 수강생 분석 정보를 조회합니다.")
  @GetMapping("/students")
  public ResponseEntity<ApiResponse<List<InstructorAnalyticsStudentResponse.StudentItem>>>
      getStudents(@Parameter(hidden = true) @AuthenticationPrincipal Long instructorId) {
    return ResponseEntity.ok(
        ApiResponse.ok(instructorLearningAnalyticsService.getStudents(instructorId)));
  }

  @Operation(summary = "강의별 진도 분석 조회", description = "강의별 진도 분석 정보를 조회합니다.")
  @GetMapping("/progress")
  public ResponseEntity<ApiResponse<List<InstructorAnalyticsProgressResponse.CourseProgressItem>>>
      getProgress(@Parameter(hidden = true) @AuthenticationPrincipal Long instructorId) {
    return ResponseEntity.ok(
        ApiResponse.ok(instructorLearningAnalyticsService.getProgress(instructorId)));
  }

  @Operation(summary = "강의별 완료율 조회", description = "강의별 완료율을 조회합니다.")
  @GetMapping("/completion-rate")
  public ResponseEntity<ApiResponse<List<InstructorAnalyticsProgressResponse.CompletionRateItem>>>
      getCompletionRate(@Parameter(hidden = true) @AuthenticationPrincipal Long instructorId) {
    return ResponseEntity.ok(
        ApiResponse.ok(instructorLearningAnalyticsService.getCompletionRate(instructorId)));
  }

  @Operation(summary = "강의별 평균 시청 시간 조회", description = "강의별 평균 시청 시간을 조회합니다.")
  @GetMapping("/average-watch-time")
  public ResponseEntity<ApiResponse<List<InstructorAnalyticsProgressResponse.AverageWatchTimeItem>>>
      getAverageWatchTime(@Parameter(hidden = true) @AuthenticationPrincipal Long instructorId) {
    return ResponseEntity.ok(
        ApiResponse.ok(instructorLearningAnalyticsService.getAverageWatchTime(instructorId)));
  }

  @Operation(summary = "과제 통계 조회", description = "과제 제출 및 채점 분석 정보를 조회합니다.")
  @GetMapping("/assignment-stats")
  public ResponseEntity<ApiResponse<InstructorAnalyticsAssignmentResponse.Detail>>
      getAssignmentStats(@Parameter(hidden = true) @AuthenticationPrincipal Long instructorId) {
    return ResponseEntity.ok(
        ApiResponse.ok(instructorLearningAnalyticsService.getAssignmentStats(instructorId)));
  }

  @Operation(summary = "퀴즈 통계 조회", description = "퀴즈 응시 분석 정보를 조회합니다.")
  @GetMapping("/quiz-stats")
  public ResponseEntity<ApiResponse<InstructorAnalyticsQuizResponse.Detail>> getQuizStats(
      @Parameter(hidden = true) @AuthenticationPrincipal Long instructorId) {
    return ResponseEntity.ok(
        ApiResponse.ok(instructorLearningAnalyticsService.getQuizStats(instructorId)));
  }

  @Operation(summary = "레슨별 이탈 분석 조회", description = "레슨별 이탈 분석 정보를 조회합니다.")
  @GetMapping("/drop-off")
  public ResponseEntity<ApiResponse<List<InstructorAnalyticsDropOffResponse.LessonItem>>>
      getDropOff(@Parameter(hidden = true) @AuthenticationPrincipal Long instructorId) {
    return ResponseEntity.ok(
        ApiResponse.ok(instructorLearningAnalyticsService.getDropOff(instructorId)));
  }

  @Operation(summary = "노드별 난이도 분석 조회", description = "노드별 난이도 분석 정보를 조회합니다.")
  @GetMapping("/difficulty")
  public ResponseEntity<ApiResponse<List<InstructorAnalyticsDifficultyResponse.NodeItem>>>
      getDifficulty(@Parameter(hidden = true) @AuthenticationPrincipal Long instructorId) {
    return ResponseEntity.ok(
        ApiResponse.ok(instructorLearningAnalyticsService.getDifficulty(instructorId)));
  }

  @Operation(summary = "수강생 진도 순위 조회", description = "진도 기준으로 정렬된 수강생 목록을 조회합니다.")
  @GetMapping("/student-progress")
  public ResponseEntity<ApiResponse<List<InstructorAnalyticsStudentResponse.StudentItem>>>
      getStudentProgress(@Parameter(hidden = true) @AuthenticationPrincipal Long instructorId) {
    return ResponseEntity.ok(
        ApiResponse.ok(instructorLearningAnalyticsService.getStudentProgress(instructorId)));
  }

  @Operation(summary = "문항 성과 조회", description = "퀴즈 문항별 성과 분석 정보를 조회합니다.")
  @GetMapping("/question-performance")
  public ResponseEntity<ApiResponse<List<InstructorAnalyticsQuizResponse.QuestionPerformanceItem>>>
      getQuestionPerformance(@Parameter(hidden = true) @AuthenticationPrincipal Long instructorId) {
    return ResponseEntity.ok(
        ApiResponse.ok(instructorLearningAnalyticsService.getQuestionPerformance(instructorId)));
  }

  @Operation(summary = "학습 퍼널 조회", description = "수강 등록부터 완료까지의 퍼널 분석 정보를 조회합니다.")
  @GetMapping("/funnel")
  public ResponseEntity<ApiResponse<InstructorAnalyticsFunnelResponse.Detail>> getFunnel(
      @Parameter(hidden = true) @AuthenticationPrincipal Long instructorId) {
    return ResponseEntity.ok(
        ApiResponse.ok(instructorLearningAnalyticsService.getFunnel(instructorId)));
  }

  @Operation(summary = "취약 지점 조회", description = "취약도 기준으로 정렬된 취약 지점 분석 정보를 조회합니다.")
  @GetMapping("/weak-points")
  public ResponseEntity<ApiResponse<List<InstructorAnalyticsWeakPointResponse.NodeItem>>>
      getWeakPoints(@Parameter(hidden = true) @AuthenticationPrincipal Long instructorId) {
    return ResponseEntity.ok(
        ApiResponse.ok(instructorLearningAnalyticsService.getWeakPoints(instructorId)));
  }
}
