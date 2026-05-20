package com.devpath.domain.voice.repository;

import com.devpath.domain.voice.entity.VoiceChatClearState;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VoiceChatClearStateRepository extends JpaRepository<VoiceChatClearState, Long> {

  @EntityGraph(attributePaths = {"channel", "channel.creator", "user"})
  Optional<VoiceChatClearState> findByChannel_IdAndUser_Id(Long channelId, Long userId);

  long deleteByChannel_Id(Long channelId);
}
