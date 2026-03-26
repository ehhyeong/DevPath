package com.devpath.api.analytics.controller;

import com.devpath.api.analytics.service.InstructorLearningAnalyticsService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Instructor Learning Analytics API 컨트롤러
@Tag(name = "Instructor - Learning Analytics", description = "강사용 학습 분석 API")
@RestController
@RequestMapping("/api/instructor/analytics")
@RequiredArgsConstructor
public class InstructorLearningAnalyticsController {

    // Instructor Learning Analytics 서비스
    private final InstructorLearningAnalyticsService instructorLearningAnalyticsService;
}
