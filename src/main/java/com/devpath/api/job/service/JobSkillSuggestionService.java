package com.devpath.api.job.service;

import com.devpath.api.job.dto.JobSkillSuggestionDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.recommendation.NodeChangeType;
import com.devpath.domain.learning.entity.recommendation.RecommendationChange;
import com.devpath.domain.learning.repository.recommendation.RecommendationChangeRepository;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.roadmap.service.NodeRequiredTagRegistrar;
import com.devpath.domain.roadmap.service.SystemDynamicRoadmapProvider;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * TASK-39: 성장공고 보완 스킬 "로드맵에서 학습하기" 처리 서비스.
 *
 * <ul>
 *   <li>커스텀 로드맵 ≥1개 → [분기 A] Gemini가 전체 노드를 읽고 가장 걸맞는 로드맵의 anchor 노드 뒤에 심화/복습 노드 추천(pending) 생성
 *   <li>커스텀 로드맵 0개 → [분기 B] Gemini가 공식 로드맵 선택(있으면 복사 / 없으면 신규 빌더 로드맵 생성)
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JobSkillSuggestionService {

  private static final int MAX_ROADMAPS_IN_PROMPT = 12;
  private static final int MAX_NODES_PER_ROADMAP = 30;
  private static final int MAX_OFFICIAL_ROADMAPS_IN_PROMPT = 40;

  private final UserRepository userRepository;
  private final CustomRoadmapRepository customRoadmapRepository;
  private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
  private final RoadmapRepository roadmapRepository;
  private final RoadmapNodeRepository roadmapNodeRepository;
  private final RecommendationChangeRepository recommendationChangeRepository;
  private final NodeRequiredTagRegistrar nodeRequiredTagRegistrar;
  private final SystemDynamicRoadmapProvider systemDynamicRoadmapProvider;
  private final JobSkillSuggestionAiClient aiClient;
  private final JobSkillRoadmapWriter roadmapWriter;

  @Transactional
  public JobSkillSuggestionDto.Response suggest(Long userId, String skill, String jobTitle) {
    if (skill == null || skill.isBlank()) {
      throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
    }
    String trimmedSkill = skill.trim();

    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

    List<CustomRoadmap> roadmaps =
        customRoadmapRepository.findAllByUserOrderByUpdatedAtDescCreatedAtDesc(user);

    if (roadmaps.isEmpty()) {
      // [분기 B] 학습 중인 커스텀 로드맵이 없음 → 기술 로드맵 신규 생성
      return createNewTechRoadmap(user, trimmedSkill);
    }
    // [분기 A] 가장 걸맞는 로드맵에 심화/복습 노드 추가 제안
    return suggestNodeIntoExistingRoadmap(user, roadmaps, trimmedSkill, jobTitle);
  }

  // ────────────────────────────── 분기 A ──────────────────────────────

  private JobSkillSuggestionDto.Response suggestNodeIntoExistingRoadmap(
      User user, List<CustomRoadmap> roadmaps, String skill, String jobTitle) {

    List<CustomRoadmap> limitedRoadmaps = roadmaps.stream().limit(MAX_ROADMAPS_IN_PROMPT).toList();

    String prompt = buildBranchAPrompt(limitedRoadmaps, skill, jobTitle);
    JsonNode result = aiClient.requestJson(prompt);

    // Gemini 선택 파싱 + 소유권 검증, 실패 시 폴백(가장 최근 로드맵의 마지막 노드)
    CustomRoadmap targetRoadmap = null;
    CustomRoadmapNode anchorNode = null;
    if (result != null) {
      Long roadmapId = aiClient.asLong(result.path("customRoadmapId"));
      Long anchorId = aiClient.asLong(result.path("anchorCustomNodeId"));
      targetRoadmap =
          limitedRoadmaps.stream()
              .filter(r -> r.getId().equals(roadmapId))
              .findFirst()
              .orElse(null);
      if (targetRoadmap != null && anchorId != null) {
        anchorNode =
            customRoadmapNodeRepository.findAllByCustomRoadmap(targetRoadmap).stream()
                .filter(n -> n.getId().equals(anchorId))
                .findFirst()
                .orElse(null);
      }
    }
    if (targetRoadmap == null) {
      targetRoadmap = limitedRoadmaps.get(0); // 가장 최근 학습/수정 로드맵
    }
    if (anchorNode == null) {
      anchorNode = lastNodeOf(targetRoadmap);
    }

    String branchType =
        normalizeBranchType(result == null ? null : result.path("branchType").asText(null));
    String nodeTitle = aiClient.textOrNull(result, "title");
    String nodeContent = aiClient.textOrNull(result, "content");
    String nodeSubTopics = aiClient.textOrNull(result, "subTopics");
    if (nodeTitle == null || nodeTitle.isBlank()) {
      nodeTitle = ("REVIEW".equals(branchType) ? "[복습] " : "[심화] ") + skill;
    }
    if (nodeContent == null || nodeContent.isBlank()) {
      nodeContent = skill + " 역량을 보완하기 위한 학습 노드입니다.";
    }
    if (nodeSubTopics == null || nodeSubTopics.isBlank()) {
      nodeSubTopics = skill;
    }
    nodeSubTopics = String.join(",", resolveNodeTags(nodeSubTopics, skill, jobTitle));

    RoadmapNode dynamicNode =
        saveDynamicNode(
            systemDynamicRoadmapProvider.resolve(),
            nodeTitle,
            nodeContent,
            nodeSubTopics,
            "BRANCH");

    String reason =
        (jobTitle != null && !jobTitle.isBlank() ? "'" + jobTitle + "' 공고의 " : "")
            + "'"
            + skill
            + "' 역량 보완을 위한 추천 노드입니다.";

    RecommendationChange change =
        recommendationChangeRepository.save(
            RecommendationChange.builder()
                .user(user)
                .roadmapNode(dynamicNode)
                .nodeChangeType(NodeChangeType.ADD)
                .targetCustomRoadmapId(targetRoadmap.getId())
                .anchorCustomNodeId(anchorNode == null ? null : anchorNode.getId())
                .branchType(branchType)
                .reason(reason)
                .build());

    return JobSkillSuggestionDto.Response.builder()
        .mode("ADD")
        .changeId(change.getId())
        .targetCustomRoadmapId(targetRoadmap.getId())
        .roadmapTitle(targetRoadmap.getTitle())
        .anchorNodeTitle(anchorNode == null ? null : nodeDisplayTitle(anchorNode))
        .newNodeTitle(nodeTitle)
        .branchType(branchType)
        .redirectUrl("/roadmap?id=" + targetRoadmap.getId())
        .build();
  }

  private String buildBranchAPrompt(List<CustomRoadmap> roadmaps, String skill, String jobTitle) {
    StringBuilder sb = new StringBuilder();
    sb.append("학습자가 채용공고에서 '").append(skill).append("' 역량을 보완하려고 합니다.");
    if (jobTitle != null && !jobTitle.isBlank()) {
      sb.append(" (출처 공고: ").append(jobTitle).append(")");
    }
    sb.append("\n아래는 학습자가 보유한 커스텀 로드맵과 노드 구성입니다.\n\n");
    for (CustomRoadmap roadmap : roadmaps) {
      sb.append("로드맵[customRoadmapId=")
          .append(roadmap.getId())
          .append("] \"")
          .append(roadmap.getTitle())
          .append("\"\n");
      List<CustomRoadmapNode> nodes =
          customRoadmapNodeRepository
              .findAllByCustomRoadmapOrderByCustomSortOrderAsc(roadmap)
              .stream()
              .limit(MAX_NODES_PER_ROADMAP)
              .toList();
      for (CustomRoadmapNode node : nodes) {
        sb.append("  - customNodeId=")
            .append(node.getId())
            .append(" | ")
            .append(nodeDisplayTitle(node));
        String chips = nodeChips(node);
        if (chips != null && !chips.isBlank()) {
          sb.append(" | 태그: ").append(chips);
        }
        sb.append("\n");
      }
    }
    sb.append(
        "\n위 로드맵 중 '"
            + skill
            + "' 역량 보완에 가장 걸맞는 로드맵 하나와, 그 로드맵 안에서 새 학습 노드를 바로 뒤에 붙이기 가장 적절한"
            + " anchor 노드 하나를 고르세요. 그리고 그 anchor 노드 다음에 학습할 심화/복습 노드를 생성하세요.\n"
            + "반드시 아래 JSON 형식으로만 응답하세요(설명 금지):\n"
            + "{\"customRoadmapId\":숫자,\"anchorCustomNodeId\":숫자,\"branchType\":\"ADVANCED 또는 REVIEW\","
            + "\"title\":\"노드 제목\",\"content\":\"노드 설명 2~3문장\",\"subTopics\":\"아래 태그 목록에서 고른 2~3개를 쉼표로\"}");
    sb.append("\n사용 가능한 태그(반드시 이 목록에서만 subTopics 선택): ")
        .append(String.join(", ", nodeRequiredTagRegistrar.activeTagVocabulary()));
    return sb.toString();
  }

  // ────────────────────────────── 분기 B ──────────────────────────────

  private JobSkillSuggestionDto.Response createNewTechRoadmap(User user, String skill) {
    List<Roadmap> officials =
        roadmapRepository.findAllByIsOfficialTrueAndIsDeletedFalse().stream()
            .limit(MAX_OFFICIAL_ROADMAPS_IN_PROMPT)
            .toList();

    Long officialRoadmapId = aiClient.pickOfficialRoadmap(skill, officials);
    List<JobSkillRoadmapWriter.NodeDraft> drafts = List.of();
    if (officialRoadmapId == null) {
      List<JobSkillSuggestionAiClient.GeneratedNode> generatedNodes =
          aiClient.generateRoadmapNodes(skill, nodeRequiredTagRegistrar.activeTagVocabulary());
      if (generatedNodes.isEmpty()) {
        generatedNodes =
            List.of(
                new JobSkillSuggestionAiClient.GeneratedNode(
                    "[입문] " + skill, skill + " 기초 학습 노드입니다.", skill));
      }
      drafts =
          generatedNodes.stream()
              .map(
                  node ->
                      new JobSkillRoadmapWriter.NodeDraft(
                          node.title(),
                          node.content(),
                          resolveNodeTags(node.subTopics(), skill, null)))
              .toList();
    }
    return roadmapWriter.create(user, skill, officialRoadmapId, drafts);
  }

  // ────────────────────────────── 공통 유틸 ──────────────────────────────

  private RoadmapNode saveDynamicNode(
      Roadmap home, String title, String content, String subTopics, String nodeType) {
    return roadmapNodeRepository.save(
        RoadmapNode.builder()
            .roadmap(home)
            .title(title)
            .content(content)
            .nodeType(nodeType)
            .sortOrder(null)
            .subTopics(subTopics)
            .build());
  }

  private CustomRoadmapNode lastNodeOf(CustomRoadmap roadmap) {
    return customRoadmapNodeRepository
        .findAllByCustomRoadmapOrderByCustomSortOrderAsc(roadmap)
        .stream()
        .reduce((first, second) -> second)
        .orElse(null);
  }

  private String nodeDisplayTitle(CustomRoadmapNode node) {
    if (node.getOriginalNode() != null) {
      return node.getOriginalNode().getTitle();
    }
    if (node.getBuilderModule() != null) {
      return node.getBuilderModule().getTitle();
    }
    return "(제목 없음)";
  }

  private String nodeChips(CustomRoadmapNode node) {
    if (node.getOriginalNode() != null) {
      return node.getOriginalNode().getSubTopics();
    }
    if (node.getBuilderModule() != null && node.getBuilderModule().getTopics() != null) {
      return String.join(", ", node.getBuilderModule().getTopics());
    }
    return null;
  }

  private String normalizeBranchType(String raw) {
    return "REVIEW".equalsIgnoreCase(raw) ? "REVIEW" : "ADVANCED";
  }

  // Gemini subTopics 를 기존 공식 태그로 정규화한다. 유효 태그 0개면 차단(노드 생성 거부).
  private List<String> resolveNodeTags(String geminiSubTopics, String skill, String jobTitle) {
    List<String> valid = nodeRequiredTagRegistrar.keepExistingTagNames(splitTags(geminiSubTopics));
    if (valid.isEmpty()) {
      valid = resolveFallbackTags(skill, jobTitle);
    }
    if (valid.isEmpty()) {
      throw new CustomException(ErrorCode.NODE_TAG_RESOLUTION_FAILED);
    }
    return valid.size() > 3 ? valid.subList(0, 3) : valid;
  }

  // skill/jobTitle 을 기존 태그 어휘와 부분 매칭해 폴백 태그를 찾는다.
  private List<String> resolveFallbackTags(String skill, String jobTitle) {
    List<String> vocabulary = nodeRequiredTagRegistrar.activeTagVocabulary();
    LinkedHashSet<String> candidates = new LinkedHashSet<>();
    String normalizedSkill = normalizeTag(skill);
    for (String tag : vocabulary) {
      String normalizedTag = normalizeTag(tag);
      if (!normalizedTag.isEmpty()
          && (normalizedTag.equals(normalizedSkill)
              || normalizedTag.contains(normalizedSkill)
              || normalizedSkill.contains(normalizedTag))) {
        candidates.add(tag);
      }
    }
    if (candidates.isEmpty() && jobTitle != null && !jobTitle.isBlank()) {
      String normalizedJob = normalizeTag(jobTitle);
      for (String tag : vocabulary) {
        String normalizedTag = normalizeTag(tag);
        if (!normalizedTag.isEmpty() && normalizedJob.contains(normalizedTag)) {
          candidates.add(tag);
        }
      }
    }
    return nodeRequiredTagRegistrar.keepExistingTagNames(candidates);
  }

  private List<String> splitTags(String raw) {
    if (raw == null || raw.isBlank()) {
      return List.of();
    }
    return Arrays.stream(raw.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
  }

  private static String normalizeTag(String value) {
    return value == null ? "" : value.trim().toLowerCase().replaceAll("\\s+", "");
  }

  private String truncate(String value, int max) {
    if (value == null) {
      return "";
    }
    return value.length() <= max ? value : value.substring(0, max) + "…";
  }
}
