package com.devpath.api.learner.service;

import com.devpath.domain.learning.entity.recommendation.NodeChangeType;
import com.devpath.domain.learning.entity.recommendation.RecommendationChange;
import com.devpath.domain.learning.entity.recommendation.RecommendationChangeStatus;
import com.devpath.domain.learning.repository.recommendation.RecommendationChangeRepository;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.service.SystemDynamicRoadmapProvider;
import com.devpath.domain.user.entity.User;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
class FrontendRoadmapDemoRecommender {

  private static final String DEMO_EMAIL = "kim.hakseup@devpath.com";
  private static final int DEMO_SCORE = 85;
  private static final long FALLBACK_DELAY_MILLIS = 1800L;
  private static final String ADVANCED_TITLE = "[심화] 렌더링 성능 디버깅";
  private static final String REVIEW_TITLE = "[복습] 렌더링 흐름 체크포인트";
  private static final String LEGACY_ADVANCED_TITLE = "[Advanced] Rendering Performance Debugging";
  private static final String LEGACY_REVIEW_TITLE = "[Review] Rendering Flow Checkpoint";

  private final RoadmapNodeRepository roadmapNodeRepository;
  private final RecommendationChangeRepository recommendationChangeRepository;
  private final SystemDynamicRoadmapProvider systemDynamicRoadmapProvider;

  boolean supports(User user, RoadmapNode clearedNode, List<String> nodeTags) {
    if (user == null || clearedNode == null || nodeTags == null) {
      return false;
    }
    if (!DEMO_EMAIL.equalsIgnoreCase(user.getEmail())) {
      return false;
    }

    String title = clearedNode.getTitle() == null ? "" : clearedNode.getTitle().toLowerCase();
    return title.contains("html")
        && title.contains("css")
        && title.contains("javascript")
        && hasTagIgnoreCase(nodeTags, "HTML")
        && hasTagIgnoreCase(nodeTags, "CSS")
        && hasTagIgnoreCase(nodeTags, "JavaScript")
        && hasTagIgnoreCase(nodeTags, "Vite");
  }

  int score() {
    return Math.min(100, DEMO_SCORE);
  }

  List<Long> recommend(
      User user,
      RoadmapNode clearedNode,
      CustomRoadmap customRoadmap,
      CustomRoadmapNode anchor,
      boolean isLowScore) {
    String title = isLowScore ? REVIEW_TITLE : ADVANCED_TITLE;
    String legacyTitle = isLowScore ? LEGACY_REVIEW_TITLE : LEGACY_ADVANCED_TITLE;
    Long targetCustomRoadmapId = customRoadmap == null ? null : customRoadmap.getId();

    RecommendationChange existingChange =
        findExistingChange(user.getId(), title, legacyTitle, targetCustomRoadmapId);
    if (existingChange != null) {
      refreshExistingChange(existingChange, isLowScore);
      return List.of(existingChange.getRoadmapNode().getNodeId());
    }

    pauseForDemoPresentation();

    RoadmapNode generated =
        roadmapNodeRepository.save(
            RoadmapNode.builder()
                .roadmap(systemDynamicRoadmapProvider.resolve())
                .title(title)
                .content(content(isLowScore))
                .nodeType("BRANCH")
                .sortOrder(null)
                .subTopics(subTopics(isLowScore))
                .branchGroup(null)
                .build());

    recommendationChangeRepository.save(
        RecommendationChange.builder()
            .user(user)
            .roadmapNode(generated)
            .branchFromNodeId(clearedNode.getNodeId())
            .targetCustomRoadmapId(targetCustomRoadmapId)
            .anchorCustomNodeId(anchor == null ? null : anchor.getId())
            .branchType(isLowScore ? "REVIEW" : "ADVANCED")
            .reason(reason(isLowScore))
            .contextSummary(contextSummary())
            .nodeChangeType(NodeChangeType.ADD)
            .build());

    return List.of(generated.getNodeId());
  }

  private boolean hasTagIgnoreCase(List<String> tags, String expected) {
    return tags.stream().anyMatch(tag -> expected.equalsIgnoreCase(tag.trim()));
  }

  private RecommendationChange findExistingChange(
      Long userId, String title, String legacyTitle, Long targetCustomRoadmapId) {
    List<RecommendationChange> changes =
        recommendationChangeRepository.findAllByUserIdAndChangeStatusOrderByCreatedAtDesc(
            userId, RecommendationChangeStatus.SUGGESTED);

    return changes.stream()
        .filter(change -> change.getRoadmapNode() != null)
        .filter(change -> Objects.equals(change.getTargetCustomRoadmapId(), targetCustomRoadmapId))
        .filter(
            change ->
                title.equals(change.getRoadmapNode().getTitle())
                    || legacyTitle.equals(change.getRoadmapNode().getTitle()))
        .findFirst()
        .orElse(null);
  }

  private void refreshExistingChange(RecommendationChange change, boolean isLowScore) {
    RoadmapNode node = change.getRoadmapNode();
    if (node != null) {
      node.updateAdminInfo(
          isLowScore ? REVIEW_TITLE : ADVANCED_TITLE,
          content(isLowScore),
          "BRANCH",
          null,
          subTopics(isLowScore),
          null);
    }
    change.updateSuggestionText(reason(isLowScore), contextSummary());
  }

  // 시연 화면의 비동기 진행 상태를 사용자가 인지할 수 있도록 최소 노출 시간을 보장한다.
  private void pauseForDemoPresentation() {
    try {
      Thread.sleep(FALLBACK_DELAY_MILLIS);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      log.warn("[FrontendRoadmapDemoRecommender] Demo fallback delay interrupted.");
    }
  }

  private String content(boolean isLowScore) {
    if (isLowScore) {
      return "브라우저 렌더링 흐름에서 DOM, CSSOM, 렌더 트리, 레이아웃, 페인트가 어떻게 이어지는지 다시 점검합니다. 첫 Vite 페이지를 DevTools와 함께 다시 구현하면서 JavaScript DOM 변경이 어떤 화면 갱신을 만드는지 설명해 봅니다.";
    }

    return "DOM 업데이트, 스타일 재계산, 레이아웃, 페인트 비용을 연결해서 렌더링 성능을 더 깊게 다룹니다. 작은 Vite 인터랙션을 기준으로 불필요한 DOM 쓰기를 줄이기 전후를 DevTools로 비교합니다.";
  }

  private String subTopics(boolean isLowScore) {
    return isLowScore ? "DOM,CSSOM,렌더 트리,레이아웃,페인트,Vite" : "DOM,CSSOM,렌더 트리,레이아웃,페인트,DevTools,Vite";
  }

  private String reason(boolean isLowScore) {
    if (isLowScore) {
      return "첫 프론트엔드 렌더링 노드에서 보완이 필요한 흐름을 다시 확인하도록 생성된 복습 추천입니다.";
    }

    return "첫 프론트엔드 렌더링 노드를 안정적으로 완료했기 때문에 렌더링 성능까지 확장하도록 생성된 심화 추천입니다.";
  }

  private String contextSummary() {
    return "첫 번째 렌더링 학습 결과를 바탕으로 다음 학습 단계가 추천되었습니다.";
  }
}
