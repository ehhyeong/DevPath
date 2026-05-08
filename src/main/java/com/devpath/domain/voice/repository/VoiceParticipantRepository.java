package com.devpath.domain.voice.repository;

import com.devpath.domain.voice.entity.VoiceParticipant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VoiceParticipantRepository extends JpaRepository<VoiceParticipant, Long> {

  // 특정 채널의 특정 사용자 참가자 정보를 조회한다.
  @EntityGraph(attributePaths = {"channel", "channel.creator", "user"})
  Optional<VoiceParticipant> findByChannel_IdAndUser_IdAndIsDeletedFalse(
      Long channelId, Long userId);

  // 특정 채널에 현재 접속 중인 특정 사용자를 조회한다.
  @EntityGraph(attributePaths = {"channel", "channel.creator", "user"})
  Optional<VoiceParticipant> findByChannel_IdAndUser_IdAndActiveTrueAndIsDeletedFalse(
      Long channelId, Long userId);

  // 특정 채널의 현재 접속 중인 참가자 목록을 입장 시간순으로 조회한다.
  @EntityGraph(attributePaths = {"channel", "channel.creator", "user"})
  List<VoiceParticipant> findAllByChannel_IdAndActiveTrueAndIsDeletedFalseOrderByJoinedAtAsc(
      Long channelId);

  // 채널 목록 응답에서 현재 접속자 수를 계산한다.
  long countByChannel_IdAndActiveTrueAndIsDeletedFalse(Long channelId);
}
