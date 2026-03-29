package com.devpath.api.admin.learning.service;

import com.devpath.api.admin.learning.dto.AdminLearningRuleRequest;
import com.devpath.api.admin.learning.dto.AdminLearningRuleResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.automation.LearningAutomationRule;
import com.devpath.domain.learning.repository.automation.LearningAutomationRuleRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Admin learning rule service.
@Service
@RequiredArgsConstructor
public class AdminLearningRuleService {

    private final LearningAutomationRuleRepository learningAutomationRuleRepository;

    @Transactional(readOnly = true)
    public List<AdminLearningRuleResponse.Detail> getRules() {
        return learningAutomationRuleRepository.findAllByOrderByPriorityDescIdDesc()
            .stream()
            .map(this::toDetail)
            .toList();
    }

    @Transactional
    public AdminLearningRuleResponse.Detail createRule(AdminLearningRuleRequest.Upsert request) {
        learningAutomationRuleRepository.findByRuleKey(request.getRuleKey())
            .ifPresent(rule -> {
                throw new CustomException(ErrorCode.DUPLICATE_LEARNING_RULE);
            });

        LearningAutomationRule savedRule = learningAutomationRuleRepository.save(
            LearningAutomationRule.builder()
                .ruleKey(request.getRuleKey())
                .ruleName(request.getRuleName())
                .description(request.getDescription())
                .ruleValue(request.getRuleValue())
                .priority(request.getPriority())
                .build()
        );

        return toDetail(savedRule);
    }

    @Transactional
    public AdminLearningRuleResponse.Detail updateRule(Long ruleId, AdminLearningRuleRequest.Upsert request) {
        LearningAutomationRule rule = learningAutomationRuleRepository.findById(ruleId)
            .orElseThrow(() -> new CustomException(ErrorCode.LEARNING_RULE_NOT_FOUND));

        learningAutomationRuleRepository.findByRuleKey(request.getRuleKey())
            .filter(foundRule -> !foundRule.getId().equals(ruleId))
            .ifPresent(foundRule -> {
                throw new CustomException(ErrorCode.DUPLICATE_LEARNING_RULE);
            });

        rule.update(
            request.getRuleKey(),
            request.getRuleName(),
            request.getDescription(),
            request.getRuleValue(),
            request.getPriority()
        );

        return toDetail(rule);
    }

    @Transactional
    public AdminLearningRuleResponse.Detail enableRule(Long ruleId) {
        LearningAutomationRule rule = learningAutomationRuleRepository.findById(ruleId)
            .orElseThrow(() -> new CustomException(ErrorCode.LEARNING_RULE_NOT_FOUND));

        rule.enable();
        return toDetail(rule);
    }

    @Transactional
    public AdminLearningRuleResponse.Detail disableRule(Long ruleId) {
        LearningAutomationRule rule = learningAutomationRuleRepository.findById(ruleId)
            .orElseThrow(() -> new CustomException(ErrorCode.LEARNING_RULE_NOT_FOUND));

        rule.disable();
        return toDetail(rule);
    }

    private AdminLearningRuleResponse.Detail toDetail(LearningAutomationRule rule) {
        return AdminLearningRuleResponse.Detail.builder()
            .ruleId(rule.getId())
            .ruleKey(rule.getRuleKey())
            .ruleName(rule.getRuleName())
            .description(rule.getDescription())
            .ruleValue(rule.getRuleValue())
            .priority(rule.getPriority())
            .status(rule.getStatus().name())
            .createdAt(rule.getCreatedAt())
            .updatedAt(rule.getUpdatedAt())
            .build();
    }
}
