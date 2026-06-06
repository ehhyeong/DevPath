package com.devpath.api.roadmap.service;

import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 노드 클리어의 "태그 게이트" 판정 단일 소스. 클리어 커맨드(NodeClearanceCommandService)와
 * 로드맵 뷰(CustomRoadmapQueryService)가 동일 로직을 공유해 UI 표시와 실제 클리어 가능 여부가 어긋나지 않게 한다.
 *
 * <p>클리어 조건 = <b>모든 필수 태그 충족</b>.
 *
 * <ul>
 *   <li>일반 노드: 필수 태그를 전역 보유했는가
 *   <li>branch(심화/복습) 노드: 노드 추가(createdAt) 이후 그 태그의 매칭 강의를 다시 완료했는가(재학습)
 *   <li>필수 태그 없음 / 빌더 기원 노드: 항상 충족
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class NodeClearanceGate {

  private static final LocalDateTime EPOCH = LocalDateTime.of(1970, 1, 1, 0, 0);

  private final LessonProgressRepository lessonProgressRepository;

  /** 필수 태그 중 충족한 개수. (일반=전역 보유 태그 수, branch=재학습 태그 수) */
  public int satisfiedTagCount(
      CustomRoadmapNode node, Long userId, List<String> requiredTags, Collection<String> userTags) {
    if (requiredTags == null || requiredTags.isEmpty() || node.getOriginalNode() == null) {
      return 0;
    }
    if (node.isBranch()) {
      LocalDateTime since = node.getCreatedAt() != null ? node.getCreatedAt() : EPOCH;
      return (int)
          lessonProgressRepository.countRelearnedTagsForNode(
              userId, node.getOriginalNode().getNodeId(), since);
    }
    Set<String> normalizedUserTags = normalize(userTags);
    return (int) normalize(requiredTags).stream().filter(normalizedUserTags::contains).count();
  }

  /** 모든 필수 태그를 충족했는지(=클리어 가능 태그 조건). */
  public boolean isTagGateSatisfied(
      CustomRoadmapNode node, Long userId, List<String> requiredTags, Collection<String> userTags) {
    if (requiredTags == null || requiredTags.isEmpty() || node.getOriginalNode() == null) {
      return true;
    }
    return satisfiedTagCount(node, userId, requiredTags, userTags) >= distinctCount(requiredTags);
  }

  private static int distinctCount(List<String> requiredTags) {
    return normalize(requiredTags).size();
  }

  private static Set<String> normalize(Collection<String> tags) {
    if (tags == null) {
      return Set.of();
    }
    return tags.stream()
        .filter(Objects::nonNull)
        .map(tag -> tag.trim().toLowerCase())
        .filter(tag -> !tag.isEmpty())
        .collect(Collectors.toSet());
  }
}
