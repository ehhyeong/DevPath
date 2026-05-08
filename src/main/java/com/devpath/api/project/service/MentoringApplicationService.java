package com.devpath.api.project.service;

import com.devpath.api.project.dto.ProjectAdvancedRequests.MentoringRequest;
import com.devpath.api.project.dto.ProjectAdvancedResponses.MentoringResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.project.entity.MentoringApplication;
import com.devpath.domain.project.entity.MentoringApplicationStatus;
import com.devpath.domain.project.entity.Project;
import com.devpath.domain.project.entity.ProjectStatus;
import com.devpath.domain.project.repository.MentoringApplicationRepository;
import com.devpath.domain.project.repository.ProjectMemberRepository;
import com.devpath.domain.project.repository.ProjectRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service("projectMentoringApplicationService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MentoringApplicationService {

  private final MentoringApplicationRepository mentoringApplicationRepository;
  private final ProjectRepository projectRepository;
  private final ProjectMemberRepository projectMemberRepository;

  @Transactional
  public MentoringResponse applyForMentoring(MentoringRequest request, Long requesterId) {
    Project project = getProjectEntity(request.getProjectId());
    validateProjectMember(project.getId(), requesterId);
    validateProjectStatus(project);
    validateDuplicatePendingApplication(request);

    MentoringApplication application =
        MentoringApplication.builder()
            .projectId(project.getId())
            .mentorId(request.getMentorId())
            .message(request.getMessage().trim())
            .status(MentoringApplicationStatus.PENDING)
            .build();

    return MentoringResponse.from(mentoringApplicationRepository.save(application));
  }

  public List<MentoringResponse> getMentoringApplications(Long projectId, Long requesterId) {
    getProjectEntity(projectId);
    validateProjectMember(projectId, requesterId);

    return mentoringApplicationRepository.findAllByProjectIdOrderByCreatedAtDesc(projectId).stream()
        .map(MentoringResponse::from)
        .toList();
  }

  private void validateProjectMember(Long projectId, Long requesterId) {
    if (!projectMemberRepository.existsByProjectIdAndLearnerId(projectId, requesterId)) {
      throw new CustomException(
          ErrorCode.UNAUTHORIZED_ACTION, "Only project members can access mentoring applications.");
    }
  }

  private void validateProjectStatus(Project project) {
    if (project.getStatus() == ProjectStatus.COMPLETED
        || project.getStatus() == ProjectStatus.ON_HOLD) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT, "Mentoring is not available for the current project status.");
    }
  }

  private void validateDuplicatePendingApplication(MentoringRequest request) {
    if (mentoringApplicationRepository.existsByProjectIdAndMentorIdAndStatus(
        request.getProjectId(), request.getMentorId(), MentoringApplicationStatus.PENDING)) {
      throw new CustomException(
          ErrorCode.DUPLICATE_RESOURCE, "A pending mentoring application already exists.");
    }
  }

  private Project getProjectEntity(Long projectId) {
    return projectRepository
        .findByIdAndIsDeletedFalse(projectId)
        .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "Project not found."));
  }
}
