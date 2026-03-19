package com.devpath.api.evaluation.service;

import com.devpath.api.evaluation.dto.request.CreateRubricRequest;
import com.devpath.api.evaluation.dto.request.UpdateRubricRequest;
import com.devpath.api.evaluation.dto.response.RubricResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.Assignment;
import com.devpath.domain.learning.entity.Rubric;
import com.devpath.domain.learning.repository.AssignmentRepository;
import com.devpath.domain.learning.repository.RubricRepository;
import com.devpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class RubricCommandService {

  // 사용자 존재 여부 확인용 리포지토리다.
  private final UserRepository userRepository;

  // 과제 조회용 리포지토리다.
  private final AssignmentRepository assignmentRepository;

  // 루브릭 저장 및 조회용 리포지토리다.
  private final RubricRepository rubricRepository;

  // 강사가 특정 과제에 루브릭 항목을 생성한다.
  public RubricResponse createRubric(Long instructorUserId, Long assignmentId, CreateRubricRequest request) {
    validateUserExists(instructorUserId);

    Assignment assignment =
        assignmentRepository
            .findByIdAndIsDeletedFalse(assignmentId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "과제를 찾을 수 없습니다."));

    Rubric rubric =
        Rubric.builder()
            .assignment(assignment)
            .criteriaName(request.getCriteriaName())
            .criteriaDescription(request.getCriteriaDescription())
            .maxPoints(request.getMaxPoints())
            .displayOrder(request.getDisplayOrder())
            .build();

    Rubric savedRubric = rubricRepository.save(rubric);
    return RubricResponse.from(savedRubric);
  }

  // 강사가 기존 루브릭 항목을 수정한다.
  public RubricResponse updateRubric(Long instructorUserId, Long rubricId, UpdateRubricRequest request) {
    validateUserExists(instructorUserId);

    Rubric rubric =
        rubricRepository
            .findByIdAndIsDeletedFalse(rubricId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "루브릭을 찾을 수 없습니다."));

    rubric.update(
        request.getCriteriaName(),
        request.getCriteriaDescription(),
        request.getMaxPoints(),
        request.getDisplayOrder());

    return RubricResponse.from(rubric);
  }

  // 요청한 사용자 ID가 실제 users 테이블에 존재하는지 검증한다.
  private void validateUserExists(Long userId) {
    if (!userRepository.existsById(userId)) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
  }
}
