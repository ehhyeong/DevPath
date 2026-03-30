package com.devpath.api.planner.service;

import com.devpath.api.planner.dto.StreakResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.planner.entity.RecoveryPlan;
import com.devpath.domain.planner.entity.Streak;
import com.devpath.domain.planner.repository.RecoveryPlanRepository;
import com.devpath.domain.planner.repository.StreakRepository;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LearnerStreakService {

    private final StreakRepository streakRepository;
    private final RecoveryPlanRepository recoveryPlanRepository;

    public StreakResponse getStreak(Long learnerId) {
        Streak streak = streakRepository.findByLearnerId(learnerId)
                .orElseGet(() -> Streak.builder()
                        .learnerId(learnerId)
                        .currentStreak(0)
                        .longestStreak(0)
                        .build());

        return StreakResponse.from(streak);
    }

    @Transactional
    public StreakResponse refreshStreak(Long learnerId) {
        Streak streak = streakRepository.findByLearnerId(learnerId)
                .orElseGet(() -> Streak.builder()
                        .learnerId(learnerId)
                        .currentStreak(0)
                        .longestStreak(0)
                        .build());

        streak.incrementStreak(LocalDate.now());
        Streak savedStreak = streakRepository.save(streak);

        return StreakResponse.from(savedStreak);
    }

    @Transactional
    public String createRecoveryPlan(Long learnerId, String planDetails) {
        if (planDetails == null || planDetails.trim().isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "복구 계획 내용은 비어 있을 수 없습니다.");
        }

        RecoveryPlan recoveryPlan = RecoveryPlan.builder()
                .learnerId(learnerId)
                .planDetails(planDetails.trim())
                .build();

        recoveryPlanRepository.save(recoveryPlan);
        return "복구 계획이 생성되었습니다.";
    }
}
