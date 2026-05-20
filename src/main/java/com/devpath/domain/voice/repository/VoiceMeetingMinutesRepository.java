package com.devpath.domain.voice.repository;

import com.devpath.domain.voice.entity.VoiceMeetingMinutes;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VoiceMeetingMinutesRepository extends JpaRepository<VoiceMeetingMinutes, Long> {

  @EntityGraph(attributePaths = {"channel", "channel.creator", "updatedBy"})
  Optional<VoiceMeetingMinutes> findByChannel_IdAndIsDeletedFalse(Long channelId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @EntityGraph(attributePaths = {"channel", "channel.creator", "updatedBy"})
  @Query(
      """
      select minutes
      from VoiceMeetingMinutes minutes
      where minutes.channel.id = :channelId
        and minutes.isDeleted = false
      """)
  Optional<VoiceMeetingMinutes> findForUpdateByChannelId(@Param("channelId") Long channelId);
}
