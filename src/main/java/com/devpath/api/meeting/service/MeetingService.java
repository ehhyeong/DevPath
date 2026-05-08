package com.devpath.api.meeting.service;

import com.devpath.api.meeting.dto.MeetingRequest;
import com.devpath.api.meeting.dto.MeetingResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.meeting.entity.MeetingAttendance;
import com.devpath.domain.meeting.entity.MeetingParticipant;
import com.devpath.domain.meeting.entity.MeetingRoom;
import com.devpath.domain.meeting.entity.MeetingStatus;
import com.devpath.domain.meeting.repository.MeetingAttendanceRepository;
import com.devpath.domain.meeting.repository.MeetingParticipantRepository;
import com.devpath.domain.meeting.repository.MeetingRoomRepository;
import com.devpath.domain.mentoring.entity.Mentoring;
import com.devpath.domain.mentoring.repository.MentoringRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MeetingService {

  private final MeetingRoomRepository meetingRoomRepository;
  private final MeetingParticipantRepository meetingParticipantRepository;
  private final MeetingAttendanceRepository meetingAttendanceRepository;
  private final MentoringRepository mentoringRepository;
  private final UserRepository userRepository;

  @Transactional
  public MeetingResponse.RoomDetail create(MeetingRequest.Create request) {
    Mentoring mentoring = getActiveMentoring(request.mentoringId());
    User host = getUser(request.hostId());

    // 멘토링 참여자만 회의방을 생성할 수 있다.
    validateMentoringParticipant(mentoring, host.getId());

    MeetingRoom meeting =
        MeetingRoom.builder()
            .mentoring(mentoring)
            .host(host)
            .title(request.title())
            .meetingUrl(resolveMeetingUrl(request.meetingUrl(), mentoring.getId()))
            .scheduledAt(request.scheduledAt())
            .build();

    return MeetingResponse.RoomDetail.from(meetingRoomRepository.save(meeting));
  }

  @Transactional
  public MeetingResponse.RoomDetail end(Long meetingId, MeetingRequest.End request) {
    MeetingRoom meeting = getActiveMeeting(meetingId);

    // 회의 생성자만 회의방을 종료할 수 있다.
    validateHost(meeting, request.hostId());

    // 이미 종료된 회의는 다시 종료하지 않는다.
    validateMeetingNotEnded(meeting);

    meeting.end();

    return MeetingResponse.RoomDetail.from(meeting);
  }

  @Transactional
  public MeetingResponse.ParticipantDetail join(Long meetingId, MeetingRequest.Join request) {
    MeetingRoom meeting = getActiveMeeting(meetingId);

    // 종료된 회의에는 재참가할 수 없다.
    validateMeetingNotEnded(meeting);

    User user = getUser(request.userId());

    // 해당 멘토링의 참여자만 회의에 참가할 수 있다.
    validateMentoringParticipant(meeting.getMentoring(), user.getId());

    // 이미 현재 접속 중인 사용자는 중복 참가할 수 없다.
    validateNotAlreadyJoined(meeting.getId(), user.getId());

    MeetingParticipant participant =
        meetingParticipantRepository
            .findByMeeting_IdAndUser_IdAndIsDeletedFalse(meeting.getId(), user.getId())
            .map(
                existingParticipant -> {
                  existingParticipant.rejoin();
                  return existingParticipant;
                })
            .orElseGet(
                () ->
                    meetingParticipantRepository.save(
                        MeetingParticipant.builder().meeting(meeting).user(user).build()));

    MeetingAttendance attendance = MeetingAttendance.builder().meeting(meeting).user(user).build();

    meetingAttendanceRepository.save(attendance);

    return MeetingResponse.ParticipantDetail.from(participant);
  }

  @Transactional
  public MeetingResponse.ParticipantDetail leave(Long meetingId, MeetingRequest.Leave request) {
    MeetingRoom meeting = getActiveMeeting(meetingId);
    User user = getUser(request.userId());

    MeetingParticipant participant =
        meetingParticipantRepository
            .findByMeeting_IdAndUser_IdAndActiveTrueAndIsDeletedFalse(meeting.getId(), user.getId())
            .orElseThrow(() -> new CustomException(ErrorCode.MEETING_PARTICIPANT_NOT_FOUND));

    MeetingAttendance attendance =
        meetingAttendanceRepository
            .findFirstByMeeting_IdAndUser_IdAndLeftAtIsNullAndIsDeletedFalseOrderByJoinedAtDesc(
                meeting.getId(), user.getId())
            .orElseThrow(() -> new CustomException(ErrorCode.MEETING_ATTENDANCE_NOT_FOUND));

    // 참가자 현재 상태와 출석 이력을 동시에 퇴장 처리한다.
    participant.leave();
    attendance.leave();

    return MeetingResponse.ParticipantDetail.from(participant);
  }

  public List<MeetingResponse.ParticipantDetail> getParticipants(Long meetingId) {
    // 존재하지 않거나 삭제된 회의방 기준으로 참가자 목록을 조회하지 않도록 막는다.
    getActiveMeeting(meetingId);

    return meetingParticipantRepository
        .findAllByMeeting_IdAndActiveTrueAndIsDeletedFalseOrderByJoinedAtAsc(meetingId)
        .stream()
        .map(MeetingResponse.ParticipantDetail::from)
        .toList();
  }

  @Transactional
  public MeetingResponse.RoomDetail updateRecordingUrl(
      Long meetingId, MeetingRequest.RecordingUrl request) {
    MeetingRoom meeting = getActiveMeeting(meetingId);

    // 회의 생성자만 녹화 URL을 저장하거나 수정할 수 있다.
    validateHost(meeting, request.hostId());

    meeting.updateRecordingUrl(request.recordingUrl());

    return MeetingResponse.RoomDetail.from(meeting);
  }

  public List<MeetingResponse.AttendanceDetail> getAttendance(Long meetingId) {
    // 존재하지 않거나 삭제된 회의방 기준으로 출석 이력을 조회하지 않도록 막는다.
    getActiveMeeting(meetingId);

    return meetingAttendanceRepository
        .findAllByMeeting_IdAndIsDeletedFalseOrderByJoinedAtAsc(meetingId)
        .stream()
        .map(MeetingResponse.AttendanceDetail::from)
        .toList();
  }

  private Mentoring getActiveMentoring(Long mentoringId) {
    return mentoringRepository
        .findByIdAndIsDeletedFalse(mentoringId)
        .orElseThrow(() -> new CustomException(ErrorCode.MENTORING_NOT_FOUND));
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
      throw new CustomException(ErrorCode.MEETING_FORBIDDEN);
    }
  }

  private void validateHost(MeetingRoom meeting, Long hostId) {
    if (!meeting.getHost().getId().equals(hostId)) {
      throw new CustomException(ErrorCode.MEETING_FORBIDDEN);
    }
  }

  private void validateMeetingNotEnded(MeetingRoom meeting) {
    if (meeting.getStatus() == MeetingStatus.ENDED) {
      throw new CustomException(ErrorCode.MEETING_ALREADY_ENDED);
    }
  }

  private void validateNotAlreadyJoined(Long meetingId, Long userId) {
    boolean alreadyJoined =
        meetingParticipantRepository
            .findByMeeting_IdAndUser_IdAndActiveTrueAndIsDeletedFalse(meetingId, userId)
            .isPresent();

    if (alreadyJoined) {
      throw new CustomException(ErrorCode.MEETING_ALREADY_JOINED);
    }
  }

  private String resolveMeetingUrl(String requestedMeetingUrl, Long mentoringId) {
    if (requestedMeetingUrl != null && !requestedMeetingUrl.trim().isEmpty()) {
      return requestedMeetingUrl;
    }

    // 외부 RTC 연동 전에는 Jitsi 호환 URL을 기본값으로 생성한다.
    return "https://meet.jit.si/devpath-mentoring-" + mentoringId + "-" + UUID.randomUUID();
  }
}
