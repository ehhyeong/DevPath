package com.devpath.domain.voice.repository;

import com.devpath.domain.voice.entity.VoiceLobbyPresence;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VoiceLobbyPresenceRepository extends JpaRepository<VoiceLobbyPresence, Long> {

  @EntityGraph(attributePaths = {"channel", "channel.creator", "user"})
  Optional<VoiceLobbyPresence> findByChannel_IdAndUser_Id(Long channelId, Long userId);

  @EntityGraph(attributePaths = {"channel", "channel.creator", "user"})
  List<VoiceLobbyPresence> findAllByChannel_IdAndLastSeenAtAfterOrderByLastSeenAtDesc(
      Long channelId, LocalDateTime threshold);

  // 하트비트가 아직 살아 있는 사용자 ID만 조회한다. (끊긴 참가자 정리 기준)
  @Query(
      """
      select presence.user.id
      from VoiceLobbyPresence presence
      where presence.channel.id = :channelId
        and presence.lastSeenAt > :threshold
      """)
  List<Long> findAliveUserIds(
      @Param("channelId") Long channelId, @Param("threshold") LocalDateTime threshold);
}
