package com.devpath.api.dashboard.service;

import com.devpath.api.dashboard.dto.DashboardSummaryResponse;
import com.devpath.api.dashboard.dto.HeatmapResponse;
import com.devpath.domain.planner.repository.StreakRepository;
import com.devpath.domain.study.repository.StudyGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LearnerDashboardService {

    private final StreakRepository streakRepository;
    private final StudyGroupRepository studyGroupRepository;

    public DashboardSummaryResponse getSummary(Long learnerId) {
        // Mock 제거: 실제 DB 조회 기반 (Streak)
        Integer currentStreak = streakRepository.findByLearnerId(learnerId)
                .map(streak -> streak.getCurrentStreak())
                .orElse(0);

        return DashboardSummaryResponse.builder()
                .totalStudyHours(0) // TODO: 실제 학습 시간 통계 쿼리 연동 필요
                .completedNodes(0)  // TODO: 실제 노드 진행도 쿼리 연동 필요
                .currentStreak(currentStreak)
                .build();
    }

    public List<HeatmapResponse> getHeatmap(Long learnerId) {
        // Mock 제거: 빈 배열을 내려주고 추후 Snapshot DB 연동
        return Collections.emptyList();
    }

    // 누락되었던 스터디 그룹 요약 메서드 추가
    public Object getDashboardStudyGroup(Long learnerId) {
        // 실제 DB 연동: 내가 속한 스터디 그룹 조회 뼈대
        // TODO: studyGroupRepository.findMyStudyGroups(learnerId) 등 커스텀 쿼리 연동
        return "스터디 그룹 요약 정보 (구현 대기중)";
    }
}