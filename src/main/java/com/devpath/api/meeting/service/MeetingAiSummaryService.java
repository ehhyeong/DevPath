package com.devpath.api.meeting.service;

import com.devpath.api.meeting.dto.MeetingAiSummaryRequest;
import com.devpath.api.meeting.dto.MeetingAiSummaryResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.meeting.entity.MeetingAiSummary;
import com.devpath.domain.meeting.entity.MeetingRoom;
import com.devpath.domain.meeting.repository.MeetingAiSummaryRepository;
import com.devpath.domain.meeting.repository.MeetingRoomRepository;
import com.devpath.domain.mentoring.entity.Mentoring;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MeetingAiSummaryService {

  private final MeetingAiSummaryRepository meetingAiSummaryRepository;
  private final MeetingRoomRepository meetingRoomRepository;
  private final UserRepository userRepository;

  @Transactional
  public MeetingAiSummaryResponse saveSummary(
      Long meetingId, Long requesterId, MeetingAiSummaryRequest.Save request) {
    MeetingRoom meeting = getActiveMeeting(meetingId);
    User requester = getUser(requesterId);

    // 해당 회의가 속한 멘토링의 참여자만 AI 요약을 저장할 수 있다.
    validateMentoringParticipant(meeting.getMentoring(), requester.getId());

    MeetingAiSummary aiSummary =
        meetingAiSummaryRepository
            .findByMeeting_IdAndIsDeletedFalse(meetingId)
            .map(
                existingSummary -> {
                  existingSummary.update(
                      requester, request.summary(), request.actionItems(), request.decisions());
                  return existingSummary;
                })
            .orElseGet(
                () ->
                    meetingAiSummaryRepository.save(
                        MeetingAiSummary.builder()
                            .meeting(meeting)
                            .createdBy(requester)
                            .summary(request.summary())
                            .actionItems(request.actionItems())
                            .decisions(request.decisions())
                            .build()));

    return MeetingAiSummaryResponse.from(aiSummary);
  }

  public MeetingAiSummaryResponse getSummary(Long meetingId) {
    // 존재하지 않거나 삭제된 회의방 기준으로 요약을 조회하지 않도록 막는다.
    getActiveMeeting(meetingId);

    return meetingAiSummaryRepository
        .findByMeeting_IdAndIsDeletedFalse(meetingId)
        .map(MeetingAiSummaryResponse::from)
        .orElseThrow(() -> new CustomException(ErrorCode.MEETING_AI_SUMMARY_NOT_FOUND));
  }

  private MeetingRoom getActiveMeeting(Long meetingId) {
    return meetingRoomRepository
        .findByIdAndIsDeletedFalse(meetingId)
        .orElseThrow(() -> new CustomException(ErrorCode.MEETING_NOT_FOUND));
  }

  private User getUser(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }

  private void validateMentoringParticipant(Mentoring mentoring, Long userId) {
    boolean mentor = mentoring.getMentor().getId().equals(userId);
    boolean mentee = mentoring.getMentee().getId().equals(userId);

    if (!mentor && !mentee) {
      throw new CustomException(ErrorCode.MEETING_AI_SUMMARY_FORBIDDEN);
    }
  }
}
