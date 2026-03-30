package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.communication.DmRoomCreateRequest;
import com.devpath.api.instructor.dto.communication.DmRoomResponse;
import com.devpath.api.instructor.dto.communication.UnansweredSummaryResponse;
import com.devpath.api.instructor.entity.DmRoom;
import com.devpath.api.instructor.repository.DmRoomRepository;
import com.devpath.api.review.entity.ReviewStatus;
import com.devpath.api.review.repository.ReviewRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.qna.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class InstructorCommunicationService {

    private final QuestionRepository questionRepository;
    private final ReviewRepository reviewRepository;
    private final DmRoomRepository dmRoomRepository;

    @Transactional(readOnly = true)
    public UnansweredSummaryResponse getUnansweredSummary(Long instructorId) {
        long unansweredQnaCount = questionRepository
                .findAllByInstructorIdAndQnaStatusAndIsDeletedFalse(instructorId, "UNANSWERED")
                .size();
        long unansweredReviewCount = reviewRepository
                .countByInstructorIdAndStatus(instructorId, ReviewStatus.UNANSWERED);
        return UnansweredSummaryResponse.builder()
                .unansweredQnaCount(unansweredQnaCount)
                .unansweredReviewCount(unansweredReviewCount)
                .totalUnansweredCount(unansweredQnaCount + unansweredReviewCount)
                .build();
    }

    public DmRoomResponse createDmRoom(Long instructorId, DmRoomCreateRequest request) {
        return dmRoomRepository
                .findByInstructorIdAndLearnerIdAndIsDeletedFalse(instructorId, request.getLearnerId())
                .map(DmRoomResponse::from)
                .orElseGet(() -> {
                    DmRoom dmRoom = DmRoom.builder()
                            .instructorId(instructorId)
                            .learnerId(request.getLearnerId())
                            .build();
                    return DmRoomResponse.from(dmRoomRepository.save(dmRoom));
                });
    }

    @Transactional(readOnly = true)
    public DmRoomResponse getDmRoom(Long roomId, Long instructorId) {
        DmRoom dmRoom = dmRoomRepository.findByIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
        if (!dmRoom.getInstructorId().equals(instructorId)) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }
        return DmRoomResponse.from(dmRoom);
    }
}