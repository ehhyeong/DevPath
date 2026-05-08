package com.devpath.api.project.service;

import com.devpath.api.project.dto.ProjectAdvancedRequests.InvitationRequest;
import com.devpath.api.project.dto.ProjectAdvancedResponses.InvitationResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.project.entity.Project;
import com.devpath.domain.project.entity.ProjectInvitation;
import com.devpath.domain.project.entity.ProjectInvitationStatus;
import com.devpath.domain.project.entity.ProjectMember;
import com.devpath.domain.project.entity.ProjectRoleType;
import com.devpath.domain.project.repository.ProjectInvitationRepository;
import com.devpath.domain.project.repository.ProjectMemberRepository;
import com.devpath.domain.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectInvitationService {

  private final ProjectInvitationRepository projectInvitationRepository;
  private final ProjectRepository projectRepository;
  private final ProjectMemberRepository projectMemberRepository;

  @Transactional
  public InvitationResponse inviteMember(InvitationRequest request, Long inviterId) {
    Project project = getProjectEntity(request.getProjectId());
    validateProjectMember(project.getId(), inviterId);

    if (projectMemberRepository.existsByProjectIdAndLearnerId(
        project.getId(), request.getInviteeId())) {
      throw new CustomException(
          ErrorCode.DUPLICATE_RESOURCE, "The invitee is already a project member.");
    }

    if (projectInvitationRepository.existsByProjectIdAndInviteeIdAndStatus(
        project.getId(), request.getInviteeId(), ProjectInvitationStatus.PENDING)) {
      throw new CustomException(
          ErrorCode.DUPLICATE_RESOURCE, "A pending invitation already exists.");
    }

    ProjectInvitation invitation =
        ProjectInvitation.builder()
            .projectId(project.getId())
            .inviterId(inviterId)
            .inviteeId(request.getInviteeId())
            .status(ProjectInvitationStatus.PENDING)
            .build();

    return InvitationResponse.from(projectInvitationRepository.save(invitation));
  }

  @Transactional
  public InvitationResponse acceptInvitation(Long invitationId, Long learnerId) {
    ProjectInvitation invitation = getInvitationEntity(invitationId);
    validateInvitationOwner(invitation, learnerId);

    if (invitation.getStatus() != ProjectInvitationStatus.PENDING) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT, "Only pending invitations can be accepted.");
    }

    getProjectEntity(invitation.getProjectId());
    invitation.accept();

    if (!projectMemberRepository.existsByProjectIdAndLearnerId(
        invitation.getProjectId(), invitation.getInviteeId())) {
      ProjectMember projectMember =
          ProjectMember.builder()
              .projectId(invitation.getProjectId())
              .learnerId(invitation.getInviteeId())
              .roleType(ProjectRoleType.FULLSTACK)
              .build();
      projectMemberRepository.save(projectMember);
    }

    return InvitationResponse.from(invitation);
  }

  @Transactional
  public InvitationResponse rejectInvitation(Long invitationId, Long learnerId) {
    ProjectInvitation invitation = getInvitationEntity(invitationId);
    validateInvitationOwner(invitation, learnerId);

    if (invitation.getStatus() != ProjectInvitationStatus.PENDING) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT, "Only pending invitations can be rejected.");
    }

    invitation.reject();
    return InvitationResponse.from(invitation);
  }

  private void validateProjectMember(Long projectId, Long learnerId) {
    if (!projectMemberRepository.existsByProjectIdAndLearnerId(projectId, learnerId)) {
      throw new CustomException(
          ErrorCode.UNAUTHORIZED_ACTION, "Only project members can invite users.");
    }
  }

  private void validateInvitationOwner(ProjectInvitation invitation, Long learnerId) {
    if (!invitation.getInviteeId().equals(learnerId)) {
      throw new CustomException(
          ErrorCode.UNAUTHORIZED_ACTION, "Only the invitee can process this invitation.");
    }
  }

  private ProjectInvitation getInvitationEntity(Long invitationId) {
    return projectInvitationRepository
        .findById(invitationId)
        .orElseThrow(
            () ->
                new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "Project invitation not found."));
  }

  private Project getProjectEntity(Long projectId) {
    return projectRepository
        .findByIdAndIsDeletedFalse(projectId)
        .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "Project not found."));
  }
}
