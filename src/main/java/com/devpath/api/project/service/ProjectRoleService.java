package com.devpath.api.project.service;

import com.devpath.api.project.dto.ProjectAdvancedRequests.RoleRequest;
import com.devpath.api.project.dto.ProjectAdvancedResponses.RoleResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.project.entity.Project;
import com.devpath.domain.project.entity.ProjectRole;
import com.devpath.domain.project.repository.ProjectMemberRepository;
import com.devpath.domain.project.repository.ProjectRepository;
import com.devpath.domain.project.repository.ProjectRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectRoleService {

  private final ProjectRoleRepository projectRoleRepository;
  private final ProjectRepository projectRepository;
  private final ProjectMemberRepository projectMemberRepository;

  @Transactional
  public RoleResponse addRole(RoleRequest request, Long requesterId) {
    Project project = getProjectEntity(request.getProjectId());
    validateProjectMember(project.getId(), requesterId);

    ProjectRole projectRole =
        ProjectRole.builder()
            .projectId(project.getId())
            .roleType(request.getRoleType())
            .requiredCount(request.getRequiredCount())
            .build();

    return RoleResponse.from(projectRoleRepository.save(projectRole));
  }

  @Transactional
  public RoleResponse updateRole(Long roleId, RoleRequest request, Long requesterId) {
    Project project = getProjectEntity(request.getProjectId());
    validateProjectMember(project.getId(), requesterId);

    ProjectRole projectRole =
        projectRoleRepository
            .findByIdAndProjectId(roleId, request.getProjectId())
            .orElseThrow(
                () -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "프로젝트 역할 정보를 찾을 수 없습니다."));

    projectRole.updateCount(request.getRequiredCount());
    return RoleResponse.from(projectRole);
  }

  private void validateProjectMember(Long projectId, Long requesterId) {
    if (!projectMemberRepository.existsByProjectIdAndLearnerId(projectId, requesterId)) {
      throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION, "프로젝트 멤버만 역할을 관리할 수 있습니다.");
    }
  }

  private Project getProjectEntity(Long projectId) {
    return projectRepository
        .findByIdAndIsDeletedFalse(projectId)
        .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "프로젝트를 찾을 수 없습니다."));
  }
}
