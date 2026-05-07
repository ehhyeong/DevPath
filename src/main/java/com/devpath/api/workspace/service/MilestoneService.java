package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.CreateMilestoneRequest;
import com.devpath.api.workspace.dto.MilestoneResponse;
import com.devpath.api.workspace.dto.UpdateMilestoneRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.workspace.entity.Milestone;
import com.devpath.domain.workspace.entity.MilestoneStatus;
import com.devpath.domain.workspace.repository.MilestoneRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MilestoneService {

    private final MilestoneRepository milestoneRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    @Transactional
    public MilestoneResponse createMilestone(Long workspaceId, Long userId,
            CreateMilestoneRequest request) {
        validateWorkspaceExists(workspaceId);
        validateMember(workspaceId, userId);

        Milestone milestone = Milestone.builder()
                .workspaceId(workspaceId)
                .title(request.getTitle())
                .description(request.getDescription())
                .startDate(request.getStartDate())
                .dueDate(request.getDueDate())
                .createdById(userId)
                .build();

        return MilestoneResponse.from(milestoneRepository.save(milestone));
    }

    public List<MilestoneResponse> getMilestones(Long workspaceId, Long userId) {
        validateWorkspaceExists(workspaceId);
        validateMember(workspaceId, userId);

        return milestoneRepository
                .findAllByWorkspaceIdAndIsDeletedFalseOrderByDueDateAsc(workspaceId)
                .stream()
                .map(MilestoneResponse::from)
                .toList();
    }

    @Transactional
    public MilestoneResponse updateMilestone(Long milestoneId, Long userId,
            UpdateMilestoneRequest request) {
        Milestone milestone = getMilestoneEntity(milestoneId);
        validateMember(milestone.getWorkspaceId(), userId);

        milestone.update(request.getTitle(), request.getDescription(),
                request.getStartDate(), request.getDueDate(), request.getStatus());
        return MilestoneResponse.from(milestone);
    }

    @Transactional
    public void deleteMilestone(Long milestoneId, Long userId) {
        Milestone milestone = getMilestoneEntity(milestoneId);
        validateMember(milestone.getWorkspaceId(), userId);
        milestone.delete();
    }

    public long countActiveMilestones(Long workspaceId) {
        return milestoneRepository.countByWorkspaceIdAndStatusInAndIsDeletedFalse(
                workspaceId, List.of(MilestoneStatus.OPEN, MilestoneStatus.IN_PROGRESS));
    }

    public long countActiveMilestonesByWorkspaceIds(List<Long> workspaceIds) {
        if (workspaceIds.isEmpty()) {
            return 0;
        }
        return milestoneRepository.countByWorkspaceIdInAndStatusInAndIsDeletedFalse(
                workspaceIds, List.of(MilestoneStatus.OPEN, MilestoneStatus.IN_PROGRESS));
    }

    // --- 내부 헬퍼 ---

    private void validateWorkspaceExists(Long workspaceId) {
        workspaceRepository.findByIdAndIsDeletedFalse(workspaceId)
                .orElseThrow(() -> new CustomException(ErrorCode.WORKSPACE_NOT_FOUND));
    }

    private void validateMember(Long workspaceId, Long userId) {
        if (!workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, userId)) {
            throw new CustomException(ErrorCode.WORKSPACE_FORBIDDEN);
        }
    }

    private Milestone getMilestoneEntity(Long milestoneId) {
        return milestoneRepository.findByIdAndIsDeletedFalse(milestoneId)
                .orElseThrow(() -> new CustomException(ErrorCode.MILESTONE_NOT_FOUND));
    }
}