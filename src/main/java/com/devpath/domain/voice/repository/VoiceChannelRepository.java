package com.devpath.domain.voice.repository;

import com.devpath.domain.voice.entity.VoiceChannel;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VoiceChannelRepository extends JpaRepository<VoiceChannel, Long> {

  // 워크스페이스별 보이스 채널 목록을 생성 시간순으로 조회한다.
  @EntityGraph(attributePaths = "creator")
  List<VoiceChannel> findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtAsc(Long workspaceId);

  // 보이스 채널 단건 조회에서 생성자 정보를 함께 로딩한다.
  @EntityGraph(attributePaths = "creator")
  Optional<VoiceChannel> findByIdAndIsDeletedFalse(Long id);
}
