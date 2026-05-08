package com.devpath.domain.meeting.repository;

import com.devpath.domain.meeting.entity.MeetingAttendance;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MeetingAttendanceRepository extends JpaRepository<MeetingAttendance, Long> {

  // 특정 회의방의 출석 이력을 입장 시간순으로 조회한다.
  @EntityGraph(attributePaths = {"meeting", "user"})
  List<MeetingAttendance> findAllByMeeting_IdAndIsDeletedFalseOrderByJoinedAtAsc(Long meetingId);

  // 아직 퇴장 처리되지 않은 활성 출석 이력을 조회한다.
  @EntityGraph(attributePaths = {"meeting", "user"})
  Optional<MeetingAttendance>
      findFirstByMeeting_IdAndUser_IdAndLeftAtIsNullAndIsDeletedFalseOrderByJoinedAtDesc(
          Long meetingId, Long userId);
}
