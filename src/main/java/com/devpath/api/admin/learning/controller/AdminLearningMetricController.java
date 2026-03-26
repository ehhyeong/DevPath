package com.devpath.api.admin.learning.controller;

import com.devpath.api.admin.learning.service.AdminLearningMetricService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Admin Learning Metric API 컨트롤러
@Tag(name = "Admin - Learning Metrics", description = "학습 성과 지표 조회 API")
@RestController
@RequestMapping("/api/admin/learning-metrics")
@RequiredArgsConstructor
public class AdminLearningMetricController {

    // Admin Learning Metric 서비스
    private final AdminLearningMetricService adminLearningMetricService;
}
