package com.devpath.api.project.service;

import com.devpath.api.project.dto.CreateSoloProjectRequest;
import com.devpath.api.project.dto.ProjectRequest;
import com.devpath.api.project.dto.ProjectResponse;
import com.devpath.api.project.dto.UpdateProjectIntroRequest;
import com.devpath.api.project.dto.UpdateProjectVisibilityRequest;
import com.devpath.api.project.dto.UpdateRecruitingStatusRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.project.entity.Project;
import com.devpath.domain.project.entity.ProjectMember;
import com.devpath.domain.project.entity.ProjectRoleType;
import com.devpath.domain.project.entity.ProjectStatus;
import com.devpath.domain.project.entity.ProjectType;
import com.devpath.domain.project.repository.ProjectMemberRepository;
import com.devpath.domain.project.repository.ProjectRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectService {

  private final ProjectRepository projectRepository;
  private final ProjectMemberRepository projectMemberRepository;

  // POST /api/projects (스쿼드 프로젝트 생성 - 기존)
  @Transactional
  public ProjectResponse createProject(ProjectRequest request, Long creatorId) {
    Project project =
        Project.builder()
            .ownerId(creatorId)
            .name(request.getName().trim())
            .description(request.getDescription())
            .projectType(ProjectType.SQUAD)
            .status(ProjectStatus.PREPARING)
            .build();

    Project savedProject = projectRepository.save(project);

    ProjectMember leaderMember =
        ProjectMember.builder()
            .projectId(savedProject.getId())
            .learnerId(creatorId)
            .roleType(ProjectRoleType.LEADER)
            .build();
    projectMemberRepository.save(leaderMember);

    return ProjectResponse.from(savedProject);
  }

  // POST /api/projects/solo (솔로 프로젝트 생성)
  @Transactional
  public ProjectResponse createSoloProject(CreateSoloProjectRequest request, Long creatorId) {
    Project project =
        Project.builder()
            .ownerId(creatorId)
            .name(request.getName().trim())
            .description(request.getDescription())
            .projectType(ProjectType.SOLO)
            .status(ProjectStatus.PREPARING)
            .build();

    Project savedProject = projectRepository.save(project);

    ProjectMember leaderMember =
        ProjectMember.builder()
            .projectId(savedProject.getId())
            .learnerId(creatorId)
            .roleType(ProjectRoleType.LEADER)
            .build();
    projectMemberRepository.save(leaderMember);

    List<ProjectMember> members = projectMemberRepository.findAllByProjectId(savedProject.getId());
    return ProjectResponse.from(savedProject, members);
  }

  // GET /api/projects (목록 - 기존)
  public List<ProjectResponse> getAllProjects() {
    return projectRepository.findAllByIsDeletedFalseOrderByCreatedAtDesc().stream()
        .map(ProjectResponse::from)
        .toList();
  }

  // GET /api/projects/{projectId} (상세 - 멤버 포함)
  public ProjectResponse getProject(Long projectId) {
    Project project = getProjectEntity(projectId);
    List<ProjectMember> members = projectMemberRepository.findAllByProjectId(projectId);
    return ProjectResponse.from(project, members);
  }

  // PUT /api/projects/{projectId} (수정 - 기존)
  @Transactional
  public ProjectResponse updateProject(Long projectId, Long requesterId, ProjectRequest request) {
    Project project = getProjectEntity(projectId);
    validateMember(project.getId(), requesterId);

    project.updateProject(request.getName().trim(), request.getDescription());
    List<ProjectMember> members = projectMemberRepository.findAllByProjectId(projectId);
    return ProjectResponse.from(project, members);
  }

  // PATCH /api/projects/{projectId}/intro
  @Transactional
  public ProjectResponse updateIntro(
      Long projectId, Long requesterId, UpdateProjectIntroRequest request) {
    Project project = getProjectEntity(projectId);
    validateOwner(project, requesterId);

    project.updateIntro(request.getIntro());
    List<ProjectMember> members = projectMemberRepository.findAllByProjectId(projectId);
    return ProjectResponse.from(project, members);
  }

  // PATCH /api/projects/{projectId}/visibility
  @Transactional
  public ProjectResponse updateVisibility(
      Long projectId, Long requesterId, UpdateProjectVisibilityRequest request) {
    Project project = getProjectEntity(projectId);
    validateOwner(project, requesterId);

    project.changeVisibility(request.getVisibility());
    List<ProjectMember> members = projectMemberRepository.findAllByProjectId(projectId);
    return ProjectResponse.from(project, members);
  }

  // PATCH /api/projects/{projectId}/recruiting-status
  @Transactional
  public ProjectResponse updateRecruitingStatus(
      Long projectId, Long requesterId, UpdateRecruitingStatusRequest request) {
    Project project = getProjectEntity(projectId);
    validateOwner(project, requesterId);

    project.changeRecruitingStatus(request.getRecruitingStatus());
    List<ProjectMember> members = projectMemberRepository.findAllByProjectId(projectId);
    return ProjectResponse.from(project, members);
  }

  // --- 내부 헬퍼 ---

  private Project getProjectEntity(Long projectId) {
    return projectRepository
        .findByIdAndIsDeletedFalse(projectId)
        .orElseThrow(() -> new CustomException(ErrorCode.PROJECT_NOT_FOUND));
  }

  private void validateOwner(Project project, Long requesterId) {
    if (!project.getOwnerId().equals(requesterId)) {
      throw new CustomException(ErrorCode.PROJECT_FORBIDDEN);
    }
  }

  private void validateMember(Long projectId, Long requesterId) {
    if (!projectMemberRepository.existsByProjectIdAndLearnerId(projectId, requesterId)) {
      throw new CustomException(ErrorCode.PROJECT_FORBIDDEN);
    }
  }
}
