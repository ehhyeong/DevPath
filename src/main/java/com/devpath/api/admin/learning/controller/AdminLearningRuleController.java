package com.devpath.api.admin.learning.controller;

import com.devpath.api.admin.learning.dto.AdminLearningRuleRequest;
import com.devpath.api.admin.learning.dto.AdminLearningRuleResponse;
import com.devpath.api.admin.learning.service.AdminLearningRuleService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Admin learning rule API controller.
@Tag(name = "Admin - Learning Automation Rule", description = "Learning automation rule management API")
@RestController
@RequestMapping("/api/admin/learning-rules")
@RequiredArgsConstructor
public class AdminLearningRuleController {

    private final AdminLearningRuleService adminLearningRuleService;

    @Operation(summary = "Get learning rules", description = "Returns all learning automation rules.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminLearningRuleResponse.Detail>>> getRules() {
        return ResponseEntity.ok(ApiResponse.ok(adminLearningRuleService.getRules()));
    }

    @Operation(summary = "Create learning rule", description = "Creates a learning automation rule.")
    @PostMapping
    public ResponseEntity<ApiResponse<AdminLearningRuleResponse.Detail>> createRule(
        @Valid @RequestBody AdminLearningRuleRequest.Upsert request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(adminLearningRuleService.createRule(request)));
    }

    @Operation(summary = "Update learning rule", description = "Updates a learning automation rule.")
    @PutMapping("/{ruleId}")
    public ResponseEntity<ApiResponse<AdminLearningRuleResponse.Detail>> updateRule(
        @PathVariable Long ruleId,
        @Valid @RequestBody AdminLearningRuleRequest.Upsert request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(adminLearningRuleService.updateRule(ruleId, request)));
    }

    @Operation(summary = "Enable learning rule", description = "Enables a learning automation rule.")
    @PatchMapping("/{ruleId}/enable")
    public ResponseEntity<ApiResponse<AdminLearningRuleResponse.Detail>> enableRule(@PathVariable Long ruleId) {
        return ResponseEntity.ok(ApiResponse.ok(adminLearningRuleService.enableRule(ruleId)));
    }

    @Operation(summary = "Disable learning rule", description = "Disables a learning automation rule.")
    @PatchMapping("/{ruleId}/disable")
    public ResponseEntity<ApiResponse<AdminLearningRuleResponse.Detail>> disableRule(@PathVariable Long ruleId) {
        return ResponseEntity.ok(ApiResponse.ok(adminLearningRuleService.disableRule(ruleId)));
    }
}
