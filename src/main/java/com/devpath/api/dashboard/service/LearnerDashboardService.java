package com.devpath.api.dashboard.service;

import com.devpath.api.dashboard.dto.DashboardStudyGroupResponse;
import com.devpath.api.dashboard.dto.DashboardSummaryResponse;
import com.devpath.api.dashboard.dto.HeatmapResponse;
import com.devpath.domain.dashboard.entity.DashboardSnapshot;
import com.devpath.domain.dashboard.repository.DashboardSnapshotRepository;
import com.devpath.domain.learning.entity.clearance.ClearanceStatus;
import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.learning.repository.clearance.NodeClearanceRepository;
import com.devpath.domain.planner.entity.Streak;
import com.devpath.domain.planner.repository.StreakRepository;
import com.devpath.domain.study.entity.StudyGroup;
import com.devpath.domain.study.entity.StudyGroupJoinStatus;
import com.devpath.domain.study.entity.StudyGroupMember;
import com.devpath.domain.study.entity.StudyGroupStatus;
import com.devpath.domain.study.repository.StudyGroupMemberRepository;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LearnerDashboardService {

    private final StreakRepository streakRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final NodeClearanceRepository nodeClearanceRepository;
    private final DashboardSnapshotRepository dashboardSnapshotRepository;
    private final StudyGroupMemberRepository studyGroupMemberRepository;

    public DashboardSummaryResponse getSummary(Long learnerId) {
        int currentStreak = streakRepository.findByLearnerId(learnerId)
                .map(Streak::getCurrentStreak)
                .orElse(0);

        int totalStudyHours = calculateTotalStudyHours(learnerId);
        int completedNodes = calculateCompletedNodes(learnerId);

        return DashboardSummaryResponse.builder()
                .totalStudyHours(totalStudyHours)
                .completedNodes(completedNodes)
                .currentStreak(currentStreak)
                .build();
    }

    public List<HeatmapResponse> getHeatmap(Long learnerId) {
        List<DashboardSnapshot> snapshots = dashboardSnapshotRepository.findAllByLearnerIdOrderBySnapshotDateAsc(learnerId);
        List<HeatmapResponse> responses = new ArrayList<>();

        int previousTotalStudyHours = 0;

        for (DashboardSnapshot snapshot : snapshots) {
            int dailyStudyHours = Math.max(snapshot.getTotalStudyHours() - previousTotalStudyHours, 0);

            responses.add(
                    HeatmapResponse.builder()
                            .date(snapshot.getSnapshotDate())
                            .activityLevel(toActivityLevel(dailyStudyHours))
                            .build()
            );

            previousTotalStudyHours = snapshot.getTotalStudyHours();
        }

        return responses;
    }

    public DashboardStudyGroupResponse getDashboardStudyGroup(Long learnerId) {
        List<StudyGroupMember> memberships = studyGroupMemberRepository
                .findAllByLearnerIdAndJoinStatusOrderByJoinedAtDesc(learnerId, StudyGroupJoinStatus.APPROVED);

        List<StudyGroupMember> activeMemberships = memberships.stream()
                .filter(member -> member.getStudyGroup() != null)
                .filter(member -> !Boolean.TRUE.equals(member.getStudyGroup().getIsDeleted()))
                .toList();

        int recruitingGroupCount = (int) activeMemberships.stream()
                .map(StudyGroupMember::getStudyGroup)
                .filter(group -> group.getStatus() == StudyGroupStatus.RECRUITING)
                .count();

        int inProgressGroupCount = (int) activeMemberships.stream()
                .map(StudyGroupMember::getStudyGroup)
                .filter(group -> group.getStatus() == StudyGroupStatus.IN_PROGRESS)
                .count();

        List<DashboardStudyGroupResponse.StudyGroupItem> groups = activeMemberships.stream()
                .map(member -> {
                    StudyGroup group = member.getStudyGroup();
                    return DashboardStudyGroupResponse.StudyGroupItem.builder()
                            .groupId(group.getId())
                            .name(group.getName())
                            .status(group.getStatus())
                            .maxMembers(group.getMaxMembers())
                            .joinedAt(member.getJoinedAt())
                            .build();
                })
                .toList();

        return DashboardStudyGroupResponse.builder()
                .joinedGroupCount(activeMemberships.size())
                .recruitingGroupCount(recruitingGroupCount)
                .inProgressGroupCount(inProgressGroupCount)
                .groups(groups)
                .build();
    }

    private int calculateTotalStudyHours(Long learnerId) {
        long totalProgressSeconds = lessonProgressRepository.sumProgressSecondsByLearnerId(learnerId);
        int totalStudyHours = (int) (totalProgressSeconds / 3600L);

        if (totalStudyHours > 0) {
            return totalStudyHours;
        }

        return dashboardSnapshotRepository.findTopByLearnerIdOrderBySnapshotDateDesc(learnerId)
                .map(DashboardSnapshot::getTotalStudyHours)
                .orElse(0);
    }

    private int calculateCompletedNodes(Long learnerId) {
        int completedNodes = (int) nodeClearanceRepository.countByUserIdAndClearanceStatus(
                learnerId,
                ClearanceStatus.CLEARED
        );

        if (completedNodes > 0) {
            return completedNodes;
        }

        return dashboardSnapshotRepository.findTopByLearnerIdOrderBySnapshotDateDesc(learnerId)
                .map(DashboardSnapshot::getCompletedNodes)
                .orElse(0);
    }

    private int toActivityLevel(int dailyStudyHours) {
        if (dailyStudyHours <= 0) {
            return 0;
        }
        if (dailyStudyHours == 1) {
            return 1;
        }
        if (dailyStudyHours <= 3) {
            return 2;
        }
        if (dailyStudyHours <= 5) {
            return 3;
        }
        return 4;
    }
}
