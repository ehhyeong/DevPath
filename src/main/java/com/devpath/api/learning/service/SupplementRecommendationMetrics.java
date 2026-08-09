package com.devpath.api.learning.service;

import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class SupplementRecommendationMetrics {

  private final UserTechStackRepository userTechStackRepository;
  private final NodeRequiredTagRepository nodeRequiredTagRepository;

  Metrics calculate(Long userId, Long nodeId) {
    return calculate(
        loadUserSkills(userId), nodeRequiredTagRepository.findTagNamesByNodeId(nodeId));
  }

  Metrics calculate(Set<String> userSkills, Collection<String> requiredTags) {
    long matchedCount = requiredTags.stream().filter(userSkills::contains).count();
    int missingTagCount = requiredTags.size() - (int) matchedCount;
    double coveragePercent =
        requiredTags.isEmpty() ? 100.0 : (matchedCount * 100.0) / requiredTags.size();
    return new Metrics(
        determinePriority(missingTagCount, coveragePercent), coveragePercent, missingTagCount);
  }

  Set<String> loadUserSkills(Long userId) {
    return new LinkedHashSet<>(userTechStackRepository.findTagNamesByUserId(userId));
  }

  Map<Long, Set<String>> loadRequiredTagsByNodeId(Set<Long> nodeIds) {
    if (nodeIds.isEmpty()) {
      return Map.of();
    }
    Map<Long, Set<String>> tagsByNodeId = new LinkedHashMap<>();
    nodeRequiredTagRepository
        .findTagNamesByNodeIds(nodeIds)
        .forEach(
            projection ->
                tagsByNodeId
                    .computeIfAbsent(projection.getNodeId(), ignored -> new LinkedHashSet<>())
                    .add(projection.getTagName()));
    return tagsByNodeId;
  }

  private Integer determinePriority(int missingTagCount, double coveragePercent) {
    if (missingTagCount > 0 && coveragePercent < 50.0) {
      return 1;
    }
    if (missingTagCount > 0 || coveragePercent < 80.0) {
      return 2;
    }
    return 3;
  }

  record Metrics(Integer priority, double coveragePercent, int missingTagCount) {}
}
