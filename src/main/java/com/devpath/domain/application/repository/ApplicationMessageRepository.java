package com.devpath.domain.application.repository;

import com.devpath.domain.application.entity.ApplicationMessage;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationMessageRepository extends JpaRepository<ApplicationMessage, Long> {

  // 특정 신청서의 메시지를 작성 시간 오름차순으로 조회한다.
  @EntityGraph(
      attributePaths = {"application", "application.sender", "application.receiver", "sender"})
  List<ApplicationMessage> findAllByApplication_IdAndIsDeletedFalseOrderByCreatedAtAsc(
      Long applicationId);
}
