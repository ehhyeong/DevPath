package com.devpath.domain.voice.repository;

import com.devpath.domain.voice.entity.VoiceLobbyPresence;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VoiceLobbyPresenceRepository extends JpaRepository<VoiceLobbyPresence, Long> {

  @EntityGraph(attributePaths = {"channel", "channel.creator", "user"})
  Optional<VoiceLobbyPresence> findByChannel_IdAndUser_Id(Long channelId, Long userId);

  @EntityGraph(attributePaths = {"channel", "channel.creator", "user"})
  List<VoiceLobbyPresence> findAllByChannel_IdAndLastSeenAtAfterOrderByLastSeenAtDesc(
      Long channelId, LocalDateTime threshold);
}
