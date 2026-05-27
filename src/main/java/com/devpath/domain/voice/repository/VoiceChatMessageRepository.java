package com.devpath.domain.voice.repository;

import com.devpath.domain.voice.entity.VoiceChatMessage;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VoiceChatMessageRepository extends JpaRepository<VoiceChatMessage, Long> {

  @EntityGraph(attributePaths = {"channel", "channel.creator", "sender"})
  List<VoiceChatMessage> findTop500ByChannel_IdAndIsDeletedFalseOrderByCreatedAtDesc(
      Long channelId);

  @EntityGraph(attributePaths = {"channel", "channel.creator", "sender"})
  List<VoiceChatMessage>
      findTop500ByChannel_IdAndIsDeletedFalseAndCreatedAtAfterOrderByCreatedAtDesc(
          Long channelId, LocalDateTime createdAt);

  long deleteByChannel_IdAndCreatedAtBefore(Long channelId, LocalDateTime createdAt);

  long deleteByChannel_Id(Long channelId);
}
