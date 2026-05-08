package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.communication.DmMessageResponse;
import com.devpath.api.instructor.dto.communication.DmRoomCreateRequest;
import com.devpath.api.instructor.dto.communication.DmRoomResponse;
import com.devpath.api.instructor.dto.communication.UnansweredSummaryResponse;
import com.devpath.api.instructor.entity.DmRoom;
import com.devpath.api.instructor.repository.DmMessageRepository;
import com.devpath.api.instructor.repository.DmRoomRepository;
import com.devpath.api.review.repository.ReviewRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.qna.repository.QuestionRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstructorCommunicationService {

  private final QuestionRepository questionRepository;
  private final ReviewRepository reviewRepository;
  private final DmRoomRepository dmRoomRepository;
  private final DmMessageRepository dmMessageRepository;
  private final UserRepository userRepository;

  // 집계는 리스트 전체를 불러오지 않고 count query를 우선 사용한다.
  public UnansweredSummaryResponse getUnansweredSummary(Long instructorId) {
    long unansweredQnaCount = questionRepository.countUnansweredByInstructorId(instructorId);
    long unansweredReviewCount = reviewRepository.countUnansweredByInstructorId(instructorId);

    return UnansweredSummaryResponse.builder()
        .unansweredQnaCount(unansweredQnaCount)
        .unansweredReviewCount(unansweredReviewCount)
        .totalUnansweredCount(unansweredQnaCount + unansweredReviewCount)
        .build();
  }

  @Transactional
  public DmRoomResponse createDmRoom(Long instructorId, DmRoomCreateRequest request) {
    validateDmTarget(instructorId, request.getLearnerId());

    DmRoom dmRoom =
        dmRoomRepository
            .findByInstructorIdAndLearnerIdAndIsDeletedFalse(instructorId, request.getLearnerId())
            .orElseGet(
                () ->
                    dmRoomRepository.save(
                        DmRoom.builder()
                            .instructorId(instructorId)
                            .learnerId(request.getLearnerId())
                            .build()));

    return toResponse(dmRoom);
  }

  public DmRoomResponse getDmRoom(Long roomId, Long instructorId) {
    DmRoom dmRoom =
        dmRoomRepository
            .findByIdAndInstructorIdAndIsDeletedFalse(roomId, instructorId)
            .orElseThrow(() -> new CustomException(ErrorCode.UNAUTHORIZED_ACTION));

    return toResponse(dmRoom);
  }

  // 자기 자신을 대상으로 DM을 만들 수 없고, 대상 사용자는 실제 존재해야 한다.
  private void validateDmTarget(Long instructorId, Long learnerId) {
    if (instructorId.equals(learnerId)) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    userRepository
        .findById(learnerId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }

  // 방 응답에는 현재까지의 메시지 목록과 마지막 메시지 시각을 포함한다.
  private DmRoomResponse toResponse(DmRoom dmRoom) {
    List<DmMessageResponse> messages =
        dmMessageRepository
            .findAllByRoomIdAndIsDeletedFalseOrderByCreatedAtAsc(dmRoom.getId())
            .stream()
            .map(DmMessageResponse::from)
            .toList();

    LocalDateTime lastMessageAt =
        messages.isEmpty() ? null : messages.get(messages.size() - 1).getCreatedAt();

    return DmRoomResponse.from(dmRoom, messages, lastMessageAt);
  }
}
