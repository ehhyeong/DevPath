package com.devpath.domain.meeting.repository;

import com.devpath.domain.meeting.entity.MeetingRoom;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MeetingRoomRepository extends JpaRepository<MeetingRoom, Long> {

  // 회의방 단건 조회에서 멘토링, 호스트, 참여자 정보를 함께 사용한다.
  @EntityGraph(
      attributePaths = {
        "mentoring",
        "mentoring.post",
        "mentoring.mentor",
        "mentoring.mentee",
        "host"
      })
  Optional<MeetingRoom> findByIdAndIsDeletedFalse(Long id);

  // 멘토링 대시보드의 회의 개수 집계에 사용한다.
  long countByMentoring_IdAndIsDeletedFalse(Long mentoringId);
}
