package com.devpath.api.project.service;

import com.devpath.api.project.dto.ProjectAdvancedRequests.ProofSubmissionRequest;
import com.devpath.api.project.dto.ProjectAdvancedResponses.ProofSubmissionResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.project.entity.Project;
import com.devpath.domain.project.entity.ProjectProofSubmission;
import com.devpath.domain.project.repository.ProjectMemberRepository;
import com.devpath.domain.project.repository.ProjectProofSubmissionRepository;
import com.devpath.domain.project.repository.ProjectRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectProofSubmissionService {

  private final ProjectProofSubmissionRepository projectProofSubmissionRepository;
  private final ProjectRepository projectRepository;
  private final ProjectMemberRepository projectMemberRepository;

  @Transactional
  public ProofSubmissionResponse submitProof(ProofSubmissionRequest request, Long submitterId) {
    Project project = getProjectEntity(request.getProjectId());
    validateProjectMember(project.getId(), submitterId);

    String normalizedProofCardRefId = request.getProofCardRefId().trim();
    if (projectProofSubmissionRepository.existsByProjectIdAndProofCardRefId(
        project.getId(), normalizedProofCardRefId)) {
      throw new CustomException(
          ErrorCode.DUPLICATE_RESOURCE, "The same proof card cannot be submitted twice.");
    }

    ProjectProofSubmission submission =
        ProjectProofSubmission.builder()
            .projectId(project.getId())
            .submitterId(submitterId)
            .proofCardRefId(normalizedProofCardRefId)
            .build();

    return ProofSubmissionResponse.from(projectProofSubmissionRepository.save(submission));
  }

  public List<ProofSubmissionResponse> getSubmissions(Long projectId) {
    getProjectEntity(projectId);

    return projectProofSubmissionRepository
        .findAllByProjectIdOrderBySubmittedAtDesc(projectId)
        .stream()
        .map(ProofSubmissionResponse::from)
        .toList();
  }

  public ProofSubmissionResponse getSubmissionDetail(Long submissionId) {
    ProjectProofSubmission submission =
        projectProofSubmissionRepository
            .findById(submissionId)
            .orElseThrow(
                () ->
                    new CustomException(
                        ErrorCode.RESOURCE_NOT_FOUND, "Project proof submission not found."));

    return ProofSubmissionResponse.from(submission);
  }

  private void validateProjectMember(Long projectId, Long learnerId) {
    if (!projectMemberRepository.existsByProjectIdAndLearnerId(projectId, learnerId)) {
      throw new CustomException(
          ErrorCode.UNAUTHORIZED_ACTION, "Only project members can submit proof.");
    }
  }

  private Project getProjectEntity(Long projectId) {
    return projectRepository
        .findByIdAndIsDeletedFalse(projectId)
        .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "Project not found."));
  }
}
