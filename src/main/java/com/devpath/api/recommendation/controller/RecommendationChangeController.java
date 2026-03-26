package com.devpath.api.recommendation.controller;

import com.devpath.api.recommendation.service.RecommendationChangeService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Recommendation Change API 컨트롤러
@Tag(name = "Learner - Recommendation Change", description = "학습자 추천 변경 API")
@RestController
@RequestMapping("/api/me/recommendation-changes")
@RequiredArgsConstructor
public class RecommendationChangeController {

    // Recommendation Change 서비스
    private final RecommendationChangeService recommendationChangeService;
}
