package com.devpath.api.learning.controller;

import com.devpath.api.learning.service.LearningHistoryService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Learning History API 컨트롤러
@Tag(name = "Learner - Learning History", description = "학습자 학습 이력 API")
@RestController
@RequestMapping("/api/me/learning-histories")
@RequiredArgsConstructor
public class LearningHistoryController {

    // Learning History 서비스
    private final LearningHistoryService learningHistoryService;
}
