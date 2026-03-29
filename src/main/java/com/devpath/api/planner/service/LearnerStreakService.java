package com.devpath.api.planner.service;

import com.devpath.api.planner.dto.StreakResponse;
import com.devpath.domain.planner.entity.Streak;
import com.devpath.domain.planner.repository.StreakRepository;
import com.devpath.domain.planner.entity.RecoveryPlan;
import com.devpath.domain.planner.repository.RecoveryPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

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

        return StreakResponse.builder()
                .currentStreak(streak.getCurrentStreak())
                .longestStreak(streak.getLongestStreak())
                .lastStudyDate(streak.getLastStudyDate()) // ✨ 수정됨 (lastActivityDate -> lastStudyDate)
                .build();
    }

    @Transactional
    public StreakResponse refreshStreak(Long learnerId) {
        Streak streak = streakRepository.findByLearnerId(learnerId)
                .orElseGet(() -> Streak.builder()
                        .learnerId(learnerId)
                        .currentStreak(0)
                        .longestStreak(0)
                        .build());

        return StreakResponse.builder()
                .currentStreak(streak.getCurrentStreak() + 1)
                .longestStreak(streak.getLongestStreak())
                .lastStudyDate(LocalDate.now()) // ✨ 수정됨 (lastActivityDate -> lastStudyDate)
                .build();
    }

    @Transactional
    public Object createRecoveryPlan(Long learnerId, String planDetails) {
        RecoveryPlan plan = RecoveryPlan.builder()
                .learnerId(learnerId)
                .planDetails(planDetails)
                .build();

        recoveryPlanRepository.save(plan);
        return "복구 계획이 생성되었습니다.";
    }
}