package com.devpath.domain.realtime.repository;

import com.devpath.domain.realtime.entity.LoungeChatMessage;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoungeChatMessageRepository extends JpaRepository<LoungeChatMessage, Long> {

  // 라운지 채팅 메시지를 오래된 순서로 조회한다.
  @EntityGraph(attributePaths = "sender")
  List<LoungeChatMessage> findAllByLoungeIdAndIsDeletedFalseOrderByCreatedAtAsc(Long loungeId);

  // 라운지 채팅 메시지를 최신 순서로 조회한다.
  @EntityGraph(attributePaths = "sender")
  List<LoungeChatMessage> findAllByLoungeIdAndIsDeletedFalseOrderByCreatedAtDesc(Long loungeId);
}
