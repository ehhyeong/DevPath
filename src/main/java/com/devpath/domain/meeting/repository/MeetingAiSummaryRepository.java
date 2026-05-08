package com.devpath.domain.meeting.repository;

import com.devpath.domain.meeting.entity.MeetingAiSummary;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MeetingAiSummaryRepository extends JpaRepository<MeetingAiSummary, Long> {

  // 회의 ID 기준으로 삭제되지 않은 AI 요약을 조회한다.
  @EntityGraph(
      attributePaths = {
        "meeting",
        "meeting.mentoring",
        "meeting.mentoring.post",
        "meeting.mentoring.mentor",
        "meeting.mentoring.mentee",
        "createdBy"
      })
  Optional<MeetingAiSummary> findByMeeting_IdAndIsDeletedFalse(Long meetingId);
}
