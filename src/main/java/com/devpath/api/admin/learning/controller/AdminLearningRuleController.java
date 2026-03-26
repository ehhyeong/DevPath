package com.devpath.api.admin.learning.controller;

import com.devpath.api.admin.learning.service.AdminLearningRuleService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Admin Learning Rule API 컨트롤러
@Tag(name = "Admin - Learning Automation Rule", description = "학습 자동화 룰 관리 API")
@RestController
@RequestMapping("/api/admin/learning-rules")
@RequiredArgsConstructor
public class AdminLearningRuleController {

    // Admin Learning Rule 서비스
    private final AdminLearningRuleService adminLearningRuleService;
}
