package com.devpath.api.admin.learning.controller;

import com.devpath.api.admin.learning.dto.AdminLearningMetricResponse;
import com.devpath.api.admin.learning.service.AdminLearningMetricService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Admin learning metric API controller.
@Tag(name = "Admin - Learning Metrics", description = "Learning metrics API")
@RestController
@RequestMapping("/api/admin/learning-metrics")
@RequiredArgsConstructor
public class AdminLearningMetricController {

    private final AdminLearningMetricService adminLearningMetricService;

    @Operation(summary = "Get learning metrics", description = "Returns the core learning metrics.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminLearningMetricResponse.Detail>>> getMetrics() {
        return ResponseEntity.ok(ApiResponse.ok(adminLearningMetricService.getMetrics()));
    }

    @Operation(summary = "Get clearance rate", description = "Returns the node clearance rate.")
    @GetMapping("/clearance-rate")
    public ResponseEntity<ApiResponse<AdminLearningMetricResponse.Detail>> getClearanceRate() {
        return ResponseEntity.ok(ApiResponse.ok(adminLearningMetricService.getClearanceRate()));
    }

    @Operation(summary = "Get roadmap completion rate", description = "Returns the roadmap completion rate.")
    @GetMapping("/roadmap-completion-rate")
    public ResponseEntity<ApiResponse<AdminLearningMetricResponse.Detail>> getRoadmapCompletionRate() {
        return ResponseEntity.ok(ApiResponse.ok(adminLearningMetricService.getRoadmapCompletionRate()));
    }

    @Operation(summary = "Get learning duration", description = "Returns the average learning duration.")
    @GetMapping("/learning-duration")
    public ResponseEntity<ApiResponse<AdminLearningMetricResponse.Detail>> getLearningDuration() {
        return ResponseEntity.ok(ApiResponse.ok(adminLearningMetricService.getLearningDuration()));
    }

    @Operation(summary = "Get quiz quality", description = "Returns the quiz quality score.")
    @GetMapping("/quiz-quality")
    public ResponseEntity<ApiResponse<AdminLearningMetricResponse.Detail>> getQuizQuality() {
        return ResponseEntity.ok(ApiResponse.ok(adminLearningMetricService.getQuizQuality()));
    }

    @Operation(summary = "Get automation monitor", description = "Returns automation monitor data based on rule states.")
    @GetMapping("/automation-monitor")
    public ResponseEntity<ApiResponse<List<AdminLearningMetricResponse.AutomationMonitorDetail>>> getAutomationMonitor() {
        return ResponseEntity.ok(ApiResponse.ok(adminLearningMetricService.getAutomationMonitor()));
    }

    @Operation(summary = "Get annual report", description = "Returns the annual learning report.")
    @GetMapping("/annual-report")
    public ResponseEntity<ApiResponse<AdminLearningMetricResponse.AnnualReportDetail>> getAnnualReport() {
        return ResponseEntity.ok(ApiResponse.ok(adminLearningMetricService.getAnnualReport()));
    }
}
