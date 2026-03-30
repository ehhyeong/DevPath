package com.devpath.api.planner.service;

import com.devpath.api.planner.dto.PlannerGoalRequest;
import com.devpath.api.planner.dto.PlannerGoalResponse;
import com.devpath.api.planner.dto.WeeklyPlanRequest;
import com.devpath.api.planner.dto.WeeklyPlanResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.planner.entity.LearnerGoal;
import com.devpath.domain.planner.entity.WeeklyPlan;
import com.devpath.domain.planner.entity.WeeklyPlanStatus;
import com.devpath.domain.planner.repository.LearnerGoalRepository;
import com.devpath.domain.planner.repository.WeeklyPlanRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LearnerPlannerService {

    private final LearnerGoalRepository learnerGoalRepository;
    private final WeeklyPlanRepository weeklyPlanRepository;

    @Transactional
    public PlannerGoalResponse createGoal(Long learnerId, PlannerGoalRequest request) {
        LearnerGoal goal = LearnerGoal.builder()
                .learnerId(learnerId)
                .goalType(request.getGoalType())
                .targetValue(request.getTargetValue())
                .build();

        return PlannerGoalResponse.from(learnerGoalRepository.save(goal));
    }

    public List<PlannerGoalResponse> getMyGoals(Long learnerId) {
        return learnerGoalRepository.findAllByLearnerIdAndIsActiveTrue(learnerId).stream()
                .map(PlannerGoalResponse::from)
                .toList();
    }

    @Transactional
    public WeeklyPlanResponse createWeeklyPlan(Long learnerId, WeeklyPlanRequest request) {
        WeeklyPlan plan = WeeklyPlan.builder()
                .learnerId(learnerId)
                .planContent(request.getPlanContent().trim())
                .status(WeeklyPlanStatus.PLANNED)
                .build();

        return WeeklyPlanResponse.from(weeklyPlanRepository.save(plan));
    }

    public List<WeeklyPlanResponse> getMyWeeklyPlans(Long learnerId) {
        return weeklyPlanRepository.findAllByLearnerIdOrderByCreatedAtDesc(learnerId).stream()
                .map(WeeklyPlanResponse::from)
                .toList();
    }

    @Transactional
    public WeeklyPlanResponse updateWeeklyPlan(Long learnerId, Long planId, WeeklyPlanRequest request) {
        WeeklyPlan plan = weeklyPlanRepository.findByIdAndLearnerId(planId, learnerId)
                .orElseThrow(() -> new CustomException(ErrorCode.UNAUTHORIZED_ACTION, "본인의 주간 플랜만 수정할 수 있습니다."));

        plan.updateContent(request.getPlanContent().trim());
        return WeeklyPlanResponse.from(plan);
    }

    @Transactional
    public WeeklyPlanResponse adjustWeeklyPlan(Long learnerId, Long planId, WeeklyPlanRequest request) {
        WeeklyPlan plan = weeklyPlanRepository.findByIdAndLearnerId(planId, learnerId)
                .orElseThrow(() -> new CustomException(ErrorCode.UNAUTHORIZED_ACTION, "본인의 주간 플랜만 조정할 수 있습니다."));

        plan.adjustPlan(request.getPlanContent().trim());
        return WeeklyPlanResponse.from(plan);
    }
}
