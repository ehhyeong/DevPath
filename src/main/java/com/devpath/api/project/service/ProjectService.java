package com.devpath.api.project.service;

import com.devpath.api.project.dto.CreateSoloProjectRequest;
import com.devpath.api.project.dto.ProjectRecommendationResponse;
import com.devpath.api.project.dto.ProjectRequest;
import com.devpath.api.project.dto.ProjectResponse;
import com.devpath.api.project.dto.UpdateProjectIntroRequest;
import com.devpath.api.project.dto.UpdateProjectVisibilityRequest;
import com.devpath.api.project.dto.UpdateRecruitingStatusRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.project.entity.Project;
import com.devpath.domain.project.entity.ProjectMember;
import com.devpath.domain.project.entity.ProjectRecruitingStatus;
import com.devpath.domain.project.entity.ProjectRoleType;
import com.devpath.domain.project.entity.ProjectStatus;
import com.devpath.domain.project.entity.ProjectType;
import com.devpath.domain.project.entity.ProjectVisibility;
import com.devpath.domain.project.repository.ProjectMemberRepository;
import com.devpath.domain.project.repository.ProjectRepository;
import com.devpath.domain.squad.entity.Squad;
import com.devpath.domain.squad.repository.SquadRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceMember;
import com.devpath.domain.workspace.entity.WorkspaceType;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectService {

  private final ProjectRepository projectRepository;
  private final ProjectMemberRepository projectMemberRepository;
  private final SquadRepository squadRepository;
  private final WorkspaceRepository workspaceRepository;
  private final WorkspaceMemberRepository workspaceMemberRepository;
  private final UserTechStackRepository userTechStackRepository;

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
    Workspace workspace = createWorkspaceForProject(savedProject, creatorId, WorkspaceType.SQUAD);

    return ProjectResponse.from(savedProject, List.of(leaderMember), workspace.getId());
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
    Workspace workspace = createWorkspaceForProject(savedProject, creatorId, WorkspaceType.SOLO);

    List<ProjectMember> members = projectMemberRepository.findAllByProjectId(savedProject.getId());
    return ProjectResponse.from(savedProject, members, workspace.getId());
  }

  // GET /api/projects (목록 - 기존)
  public List<ProjectResponse> getAllProjects() {
    return projectRepository.findAllByIsDeletedFalseOrderByCreatedAtDesc().stream()
        .map(ProjectResponse::from)
        .toList();
  }

  public List<ProjectRecommendationResponse> getMyRecommendations(Long userId) {
    List<String> skillTags = userTechStackRepository.findTagNamesByUserId(userId);
    List<ProjectRecommendationResponse> recommendations = new ArrayList<>();

    if (!skillTags.isEmpty()) {
      recommendations.addAll(
          projectRepository.findAllByIsDeletedFalseOrderByCreatedAtDesc().stream()
              .filter(project -> project.getVisibility() == ProjectVisibility.PUBLIC)
              .filter(project -> project.getRecruitingStatus() == ProjectRecruitingStatus.OPEN)
              .map(project -> toRecommendation(project, skillTags))
              .filter(recommendation -> !recommendation.getMatchedSkillTags().isEmpty())
              .toList());
    }

    List<Squad> activeSquads =
        squadRepository.findAllByIsDeletedFalseAndIsArchivedFalseOrderByCreatedAtDesc();

    if (!skillTags.isEmpty()) {
      recommendations.addAll(
          activeSquads.stream()
              .map(squad -> toSquadRecommendation(squad, skillTags))
              .filter(recommendation -> !recommendation.getMatchedSkillTags().isEmpty())
              .toList());
    }

    if (recommendations.isEmpty()) {
      recommendations.addAll(
          activeSquads.stream().map(this::toFallbackSquadRecommendation).toList());
    }

    return recommendations.stream()
        .sorted(
            Comparator.comparingInt(this::getRecommendationPriority)
                .thenComparing(
                    ProjectRecommendationResponse::getRecommendationScore,
                    Comparator.reverseOrder())
                .thenComparing(ProjectRecommendationResponse::getProjectId))
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

  private Workspace createWorkspaceForProject(
      Project project, Long creatorId, WorkspaceType workspaceType) {
    Workspace workspace =
        Workspace.builder()
            .ownerId(creatorId)
            .name(project.getName())
            .description(project.getDescription())
            .type(workspaceType)
            .build();

    Workspace savedWorkspace = workspaceRepository.save(workspace);
    workspaceMemberRepository.save(
        WorkspaceMember.builder().workspaceId(savedWorkspace.getId()).learnerId(creatorId).build());
    return savedWorkspace;
  }

  private ProjectRecommendationResponse toRecommendation(Project project, List<String> skillTags) {
    List<String> matchedSkillTags =
        skillTags.stream()
            .filter(skill -> projectContainsSkill(project, skill))
            .distinct()
            .toList();

    return ProjectRecommendationResponse.from(
        project, Math.min(100, matchedSkillTags.size() * 20), matchedSkillTags);
  }

  private int getRecommendationPriority(ProjectRecommendationResponse recommendation) {
    return "LOUNGE_SQUAD".equals(recommendation.getSourceType()) ? 0 : 1;
  }

  private boolean projectContainsSkill(Project project, String skill) {
    if (skill == null || skill.isBlank()) {
      return false;
    }

    String normalizedSkill = skill.trim().toLowerCase(Locale.ROOT);

    return containsIgnoreCase(project.getName(), normalizedSkill)
        || containsIgnoreCase(project.getDescription(), normalizedSkill)
        || containsIgnoreCase(project.getIntro(), normalizedSkill);
  }

  private boolean containsIgnoreCase(String source, String normalizedNeedle) {
    return source != null && source.toLowerCase(Locale.ROOT).contains(normalizedNeedle);
  }

  private ProjectRecommendationResponse toSquadRecommendation(Squad squad, List<String> skillTags) {
    List<String> matchedSkillTags =
        skillTags.stream().filter(skill -> squadContainsSkill(squad, skill)).distinct().toList();

    int score = Math.min(100, 55 + matchedSkillTags.size() * 15);
    return ProjectRecommendationResponse.fromSquad(
        squad, score, matchedSkillTags, buildSquadReason(matchedSkillTags));
  }

  private ProjectRecommendationResponse toFallbackSquadRecommendation(Squad squad) {
    List<String> tags = splitCsv(squad.getTags()).stream().limit(3).toList();
    return ProjectRecommendationResponse.fromSquad(squad, 45, tags, "최근 공개 모집 중인 라운지 프로젝트입니다.");
  }

  private boolean squadContainsSkill(Squad squad, String skill) {
    if (skill == null || skill.isBlank()) {
      return false;
    }

    String normalizedSkill = skill.trim().toLowerCase(Locale.ROOT);

    return containsIgnoreCase(squad.getName(), normalizedSkill)
        || containsIgnoreCase(squad.getDescription(), normalizedSkill)
        || containsIgnoreCase(squad.getTags(), normalizedSkill)
        || containsIgnoreCase(squad.getRoles(), normalizedSkill);
  }

  private List<String> splitCsv(String value) {
    if (value == null || value.isBlank()) {
      return List.of();
    }

    return Arrays.stream(value.split(","))
        .map(String::trim)
        .filter(token -> !token.isBlank())
        .distinct()
        .toList();
  }

  private String buildSquadReason(List<String> matchedSkillTags) {
    if (matchedSkillTags.isEmpty()) {
      return "최근 공개 모집 중인 라운지 프로젝트입니다.";
    }

    return String.join(", ", matchedSkillTags) + " 기술 스택과 맞는 라운지 모집글입니다.";
  }
}
