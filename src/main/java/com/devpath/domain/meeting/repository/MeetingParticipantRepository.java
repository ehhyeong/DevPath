package com.devpath.domain.meeting.repository;

import com.devpath.domain.meeting.entity.MeetingParticipant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MeetingParticipantRepository extends JpaRepository<MeetingParticipant, Long> {

  // 특정 회의방에서 특정 사용자의 참가자 레코드를 조회한다.
  @EntityGraph(attributePaths = {"meeting", "user"})
  Optional<MeetingParticipant> findByMeeting_IdAndUser_IdAndIsDeletedFalse(
      Long meetingId, Long userId);

  // 현재 회의방에 접속 중인 참가자를 조회한다.
  @EntityGraph(attributePaths = {"meeting", "user"})
  Optional<MeetingParticipant> findByMeeting_IdAndUser_IdAndActiveTrueAndIsDeletedFalse(
      Long meetingId, Long userId);

  // 현재 접속 중인 참가자 목록을 입장 시간순으로 조회한다.
  @EntityGraph(attributePaths = {"meeting", "user"})
  List<MeetingParticipant> findAllByMeeting_IdAndActiveTrueAndIsDeletedFalseOrderByJoinedAtAsc(
      Long meetingId);
}
