package com.devpath.api.evaluation.service;

import com.devpath.api.evaluation.dto.request.CreateAssignmentRequest;
import com.devpath.api.evaluation.dto.response.AssignmentDetailResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.Assignment;
import com.devpath.domain.learning.repository.AssignmentRepository;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AssignmentCommandService {

  // 사용자 존재 여부 확인용 리포지토리다.
  private final UserRepository userRepository;

  // 로드맵 노드 조회용 리포지토리다.
  private final RoadmapNodeRepository roadmapNodeRepository;

  // 과제 저장 및 조회용 리포지토리다.
  private final AssignmentRepository assignmentRepository;

  // 강사가 과제 루트 정보를 생성한다.
  public AssignmentDetailResponse createAssignment(Long instructorUserId, CreateAssignmentRequest request) {
    validateUserExists(instructorUserId);

    RoadmapNode roadmapNode =
        roadmapNodeRepository
            .findById(request.getRoadmapNodeId())
            .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NODE_NOT_FOUND));

    Assignment assignment =
        Assignment.builder()
            .roadmapNode(roadmapNode)
            .title(request.getTitle())
            .description(request.getDescription())
            .submissionType(request.getSubmissionType())
            .dueAt(request.getDueAt())
            .allowedFileFormats(request.getAllowedFileFormats())
            .readmeRequired(request.getReadmeRequired())
            .testRequired(request.getTestRequired())
            .lintRequired(request.getLintRequired())
            .submissionRuleDescription(request.getSubmissionRuleDescription())
            .totalScore(request.getTotalScore())
            .isPublished(request.getIsPublished())
            .isActive(request.getIsActive())
            .allowLateSubmission(request.getAllowLateSubmission())
            .build();

    Assignment savedAssignment = assignmentRepository.save(assignment);
    return AssignmentDetailResponse.from(savedAssignment);
  }

  // 강사가 과제 제출 규칙을 저장하거나 수정한다.
  public AssignmentDetailResponse updateSubmissionRule(
      Long instructorUserId, Long assignmentId, CreateAssignmentRequest request) {
    validateUserExists(instructorUserId);

    Assignment assignment =
        assignmentRepository
            .findByIdAndIsDeletedFalse(assignmentId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "과제를 찾을 수 없습니다."));

    // 제출 규칙 저장 API에서도 마감일은 함께 바꿀 수 있어야 하므로 updateInfo와 updateSubmissionRule을 같이 호출한다.
    assignment.updateInfo(
        assignment.getTitle(),
        assignment.getDescription(),
        request.getSubmissionType() == null ? assignment.getSubmissionType() : request.getSubmissionType(),
        request.getDueAt(),
        assignment.getTotalScore());

    assignment.updateSubmissionRule(
        request.getAllowedFileFormats(),
        request.getReadmeRequired(),
        request.getTestRequired(),
        request.getLintRequired(),
        request.getSubmissionRuleDescription(),
        request.getAllowLateSubmission());

    return AssignmentDetailResponse.from(assignment);
  }

  // 요청한 사용자 ID가 실제 users 테이블에 존재하는지 검증한다.
  private void validateUserExists(Long userId) {
    if (!userRepository.existsById(userId)) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
  }
}
