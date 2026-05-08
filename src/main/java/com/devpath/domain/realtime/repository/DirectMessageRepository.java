package com.devpath.domain.realtime.repository;

import com.devpath.domain.realtime.entity.DirectMessage;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DirectMessageRepository extends JpaRepository<DirectMessage, Long> {

  // 두 사용자 간 1:1 메시지를 오래된 순서로 조회한다.
  @EntityGraph(attributePaths = {"sender", "receiver"})
  List<DirectMessage>
      findAllBySender_IdAndReceiver_IdAndIsDeletedFalseOrReceiver_IdAndSender_IdAndIsDeletedFalseOrderByCreatedAtAsc(
          Long senderId, Long receiverId, Long reverseReceiverId, Long reverseSenderId);

  // 두 사용자 간 1:1 메시지를 최신 순서로 조회한다.
  @EntityGraph(attributePaths = {"sender", "receiver"})
  List<DirectMessage>
      findAllBySender_IdAndReceiver_IdAndIsDeletedFalseOrReceiver_IdAndSender_IdAndIsDeletedFalseOrderByCreatedAtDesc(
          Long senderId, Long receiverId, Long reverseReceiverId, Long reverseSenderId);
}
