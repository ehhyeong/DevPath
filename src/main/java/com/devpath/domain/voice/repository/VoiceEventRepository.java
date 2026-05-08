package com.devpath.domain.voice.repository;

import com.devpath.domain.voice.entity.VoiceEvent;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VoiceEventRepository extends JpaRepository<VoiceEvent, Long> {

  // 특정 채널의 상태 이벤트를 최신순으로 조회할 때 사용할 수 있다.
  @EntityGraph(attributePaths = {"channel", "actor"})
  List<VoiceEvent> findAllByChannel_IdOrderByCreatedAtDesc(Long channelId);
}
