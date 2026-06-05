package com.devpath.api.roadmap.service;

import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * AI 동적 학습 노드(성장공고 심화/복습, 진단 퀴즈 추천 등)를 보관하는 시스템 로드맵을 제공한다.
 * is_official=false, 허브/UI 미노출. 동적 노드를 공식 로드맵에 직접 붙이면 복사 시 전파되므로 별도 보관소에 둔다.
 */
@Component
@RequiredArgsConstructor
public class SystemDynamicRoadmapProvider {

  public static final String SYSTEM_ROADMAP_TITLE = "__SYSTEM_AI_DYNAMIC_NODES__";

  private final RoadmapRepository roadmapRepository;

  @Transactional
  public Roadmap resolve() {
    return roadmapRepository
        .findFirstByTitle(SYSTEM_ROADMAP_TITLE)
        .orElseGet(
            () ->
                roadmapRepository.save(
                    Roadmap.builder()
                        .title(SYSTEM_ROADMAP_TITLE)
                        .description("AI 동적 학습 노드 보관용 시스템 로드맵 (UI 비노출)")
                        .isOfficial(false)
                        .isPublic(false)
                        .isDeleted(false)
                        .build()));
  }
}
