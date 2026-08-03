package com.devpath.api.roadmap.service;

import com.devpath.domain.roadmap.entity.NodeRequiredTag;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.user.entity.Tag;
import com.devpath.domain.user.repository.TagRepository;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 동적/추천 노드의 subTopics 를 기존 공식 태그(node_required_tags)에 연결하고, 프롬프트용 태그 어휘 제공 및 후보 태그명 검증을 담당한다.
 * 성장공고(JobSkillSuggestionService)와 추천 수락(RecommendationChangeService)에서 공통으로 사용한다.
 */
@Component
@RequiredArgsConstructor
public class NodeRequiredTagRegistrar {

  private static final int DEFAULT_VOCABULARY_LIMIT = 120;

  private final TagRepository tagRepository;
  private final NodeRequiredTagRepository nodeRequiredTagRepository;

  /** 프롬프트에 제시할 공식·미삭제 태그명 목록(상한 적용). */
  public List<String> activeTagVocabulary() {
    return activeTagVocabulary(DEFAULT_VOCABULARY_LIMIT);
  }

  public List<String> activeTagVocabulary(int limit) {
    return officialTags().stream()
        .map(Tag::getName)
        .filter(name -> name != null && !name.isBlank())
        .limit(limit)
        .toList();
  }

  /** 후보 이름 중 실재하는 공식 태그만 정규(원본) 이름으로 남긴다. 대소문자/공백 무시, 중복 제거, 입력 순서 유지. */
  public List<String> keepExistingTagNames(Collection<String> candidates) {
    if (candidates == null || candidates.isEmpty()) {
      return List.of();
    }
    Map<String, String> canonical = new LinkedHashMap<>();
    for (Tag tag : officialTags()) {
      if (tag.getName() != null && !tag.getName().isBlank()) {
        canonical.putIfAbsent(normalize(tag.getName()), tag.getName());
      }
    }
    LinkedHashSet<String> matched = new LinkedHashSet<>();
    for (String candidate : candidates) {
      if (candidate == null) {
        continue;
      }
      String canonicalName = canonical.get(normalize(candidate));
      if (canonicalName != null) {
        matched.add(canonicalName);
      }
    }
    return new ArrayList<>(matched);
  }

  /** node.subTopics 의 태그를 node_required_tags 에 연결하고 새로 연결한 개수를 반환한다. */
  @Transactional
  public int registerFromSubTopics(RoadmapNode node) {
    if (node.getSubTopics() == null || node.getSubTopics().isBlank()) {
      return 0;
    }
    Map<String, Tag> canonical = new LinkedHashMap<>();
    for (Tag tag : officialTags()) {
      if (tag.getName() != null && !tag.getName().isBlank()) {
        canonical.putIfAbsent(normalize(tag.getName()), tag);
      }
    }
    List<String> names =
        Arrays.stream(node.getSubTopics().split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toList();
    int linked = 0;
    for (String name : names) {
      Tag tag = canonical.get(normalize(name));
      if (tag == null) {
        continue;
      }
      if (!nodeRequiredTagRepository.existsByNodeNodeIdAndTagTagId(
          node.getNodeId(), tag.getTagId())) {
        nodeRequiredTagRepository.save(NodeRequiredTag.builder().node(node).tag(tag).build());
        linked++;
      }
    }
    return linked;
  }

  private List<Tag> officialTags() {
    return tagRepository.findAllByIsOfficialTrueAndIsDeletedFalseOrderByTagIdAsc();
  }

  private static String normalize(String value) {
    return value == null ? "" : value.trim().toLowerCase().replaceAll("\\s+", "");
  }
}
