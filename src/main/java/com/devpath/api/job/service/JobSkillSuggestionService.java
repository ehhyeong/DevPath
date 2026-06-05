package com.devpath.api.job.service;

import com.devpath.api.job.dto.JobSkillSuggestionDto;
import com.devpath.api.roadmap.service.CustomRoadmapCopyService;
import com.devpath.api.roadmap.service.NodeRequiredTagRegistrar;
import com.devpath.api.roadmap.service.RoadmapProgressService;
import com.devpath.api.roadmap.service.SystemDynamicRoadmapProvider;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.common.provider.GeminiProvider;
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
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
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
  private static final int GENERATED_ROADMAP_MIN_NODES = 5;
  private static final int GENERATED_ROADMAP_MAX_NODES = 7;
  private static final ObjectMapper MAPPER = new ObjectMapper();

  private final UserRepository userRepository;
  private final CustomRoadmapRepository customRoadmapRepository;
  private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
  private final RoadmapRepository roadmapRepository;
  private final RoadmapNodeRepository roadmapNodeRepository;
  private final RecommendationChangeRepository recommendationChangeRepository;
  private final CustomRoadmapCopyService customRoadmapCopyService;
  private final RoadmapProgressService roadmapProgressService;
  private final NodeRequiredTagRegistrar nodeRequiredTagRegistrar;
  private final SystemDynamicRoadmapProvider systemDynamicRoadmapProvider;
  private final GeminiProvider geminiProvider;

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

    List<CustomRoadmap> limitedRoadmaps =
        roadmaps.stream().limit(MAX_ROADMAPS_IN_PROMPT).toList();

    String prompt = buildBranchAPrompt(limitedRoadmaps, skill, jobTitle);
    JsonNode result = callGeminiJson(prompt);

    // Gemini 선택 파싱 + 소유권 검증, 실패 시 폴백(가장 최근 로드맵의 마지막 노드)
    CustomRoadmap targetRoadmap = null;
    CustomRoadmapNode anchorNode = null;
    if (result != null) {
      Long roadmapId = asLong(result.path("customRoadmapId"));
      Long anchorId = asLong(result.path("anchorCustomNodeId"));
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

    String branchType = normalizeBranchType(result == null ? null : result.path("branchType").asText(null));
    String nodeTitle = textOrNull(result, "title");
    String nodeContent = textOrNull(result, "content");
    String nodeSubTopics = textOrNull(result, "subTopics");
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
            systemDynamicRoadmapProvider.resolve(), nodeTitle, nodeContent, nodeSubTopics, "BRANCH");

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
          customRoadmapNodeRepository.findAllByCustomRoadmapOrderByCustomSortOrderAsc(roadmap)
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

    Long officialRoadmapId = pickOfficialRoadmapViaGemini(skill, officials);

    if (officialRoadmapId != null) {
      // 매칭 공식 로드맵 복사
      Long customRoadmapId = customRoadmapCopyService.copyToCustomRoadmap(user.getId(), officialRoadmapId);
      CustomRoadmap created =
          customRoadmapRepository
              .findById(customRoadmapId)
              .orElseThrow(() -> new CustomException(ErrorCode.CUSTOM_ROADMAP_NOT_FOUND));
      return JobSkillSuggestionDto.Response.builder()
          .mode("CREATED")
          .targetCustomRoadmapId(customRoadmapId)
          .roadmapTitle(created.getTitle())
          .redirectUrl("/roadmap?id=" + customRoadmapId)
          .build();
    }

    // 매칭 공식 로드맵이 없으면 Gemini로 신규 빌더 로드맵 생성
    return generateBuilderRoadmap(user, skill);
  }

  private Long pickOfficialRoadmapViaGemini(String skill, List<Roadmap> officials) {
    if (officials.isEmpty()) {
      return null;
    }
    StringBuilder sb = new StringBuilder();
    sb.append("학습자가 '").append(skill).append("' 기술을 학습하려고 합니다.\n");
    sb.append("아래 공식 로드맵 목록 중 이 기술 학습에 가장 적합한 로드맵의 id를 고르세요.\n");
    sb.append("적합한 로드맵이 없으면 null을 반환하세요.\n\n");
    for (Roadmap roadmap : officials) {
      sb.append("- id=")
          .append(roadmap.getRoadmapId())
          .append(" | ")
          .append(roadmap.getTitle());
      if (roadmap.getDescription() != null && !roadmap.getDescription().isBlank()) {
        sb.append(" | ").append(truncate(roadmap.getDescription(), 80));
      }
      sb.append("\n");
    }
    sb.append("\n반드시 아래 JSON 형식으로만 응답하세요: {\"officialRoadmapId\": 숫자 또는 null}");

    JsonNode result = callGeminiJson(sb.toString());
    if (result == null) {
      return null;
    }
    Long picked = asLong(result.path("officialRoadmapId"));
    if (picked == null) {
      return null;
    }
    Set<Long> validIds =
        officials.stream().map(Roadmap::getRoadmapId).collect(Collectors.toSet());
    return validIds.contains(picked) ? picked : null;
  }

  private JobSkillSuggestionDto.Response generateBuilderRoadmap(User user, String skill) {
    String roadmapTitle = skill + " 학습 로드맵";
    CustomRoadmap created =
        customRoadmapRepository.save(
            CustomRoadmap.builderOriginBuilder().user(user).title(roadmapTitle).build());

    List<GeneratedNode> generatedNodes = generateRoadmapNodesViaGemini(skill);
    if (generatedNodes.isEmpty()) {
      generatedNodes =
          List.of(new GeneratedNode("[입문] " + skill, skill + " 기초 학습 노드입니다.", skill));
    }

    Roadmap systemRoadmap = systemDynamicRoadmapProvider.resolve();
    int order = 0;
    for (GeneratedNode generated : generatedNodes) {
      String subTopics = String.join(",", resolveNodeTags(generated.subTopics(), skill, null));
      RoadmapNode dynamicNode =
          saveDynamicNode(systemRoadmap, generated.title(), generated.content(), subTopics, "NODE");
      nodeRequiredTagRegistrar.registerFromSubTopics(dynamicNode);
      customRoadmapNodeRepository.save(
          CustomRoadmapNode.builder()
              .customRoadmap(created)
              .originalNode(dynamicNode)
              .customSortOrder(order++)
              .isBranch(false)
              .build());
    }

    roadmapProgressService.updateProgressRate(
        created, customRoadmapNodeRepository.findAllByCustomRoadmap(created));

    return JobSkillSuggestionDto.Response.builder()
        .mode("CREATED")
        .targetCustomRoadmapId(created.getId())
        .roadmapTitle(created.getTitle())
        .redirectUrl("/roadmap?id=" + created.getId())
        .build();
  }

  private List<GeneratedNode> generateRoadmapNodesViaGemini(String skill) {
    String prompt =
        "학습자가 '"
            + skill
            + "' 기술을 처음부터 학습하려고 합니다.\n"
            + GENERATED_ROADMAP_MIN_NODES
            + "~"
            + GENERATED_ROADMAP_MAX_NODES
            + "개의 학습 노드를 입문→심화 순서로 구성하세요.\n"
            + "각 노드의 subTopics 는 아래 태그 목록에서만 2~3개를 골라 쉼표로 작성하세요.\n"
            + "사용 가능한 태그: "
            + String.join(", ", nodeRequiredTagRegistrar.activeTagVocabulary())
            + "\n반드시 아래 JSON 형식으로만 응답하세요(설명 금지):\n"
            + "{\"nodes\":[{\"title\":\"노드 제목\",\"content\":\"노드 설명 2~3문장\",\"subTopics\":\"태그1,태그2\"}]}";

    JsonNode result = callGeminiJson(prompt);
    List<GeneratedNode> nodes = new ArrayList<>();
    if (result != null && result.path("nodes").isArray()) {
      for (JsonNode nodeJson : result.path("nodes")) {
        String title = textValue(nodeJson, "title");
        if (title == null || title.isBlank()) {
          continue;
        }
        String content = textValue(nodeJson, "content");
        String subTopics = textValue(nodeJson, "subTopics");
        nodes.add(
            new GeneratedNode(
                title,
                content == null || content.isBlank() ? skill + " 관련 학습 내용입니다." : content,
                subTopics == null || subTopics.isBlank() ? skill : subTopics));
        if (nodes.size() >= GENERATED_ROADMAP_MAX_NODES) {
          break;
        }
      }
    }
    return nodes;
  }

  private record GeneratedNode(String title, String content, String subTopics) {}

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
            .branchGroup(null)
            .build());
  }

  private CustomRoadmapNode lastNodeOf(CustomRoadmap roadmap) {
    return customRoadmapNodeRepository.findAllByCustomRoadmapOrderByCustomSortOrderAsc(roadmap)
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

  // Gemini JSON 응답을 안전하게 파싱한다. 실패 시 null 반환(호출부에서 폴백).
  private JsonNode callGeminiJson(String prompt) {
    try {
      String raw = geminiProvider.generateJson(prompt);
      if (raw == null) {
        return null;
      }
      int start = raw.indexOf('{');
      int end = raw.lastIndexOf('}');
      if (start < 0 || end <= start) {
        return null;
      }
      return MAPPER.readTree(raw.substring(start, end + 1));
    } catch (Exception e) {
      log.warn("[JobSkillSuggestionService] Gemini 파싱 실패: {}", e.getMessage());
      return null;
    }
  }

  private Long asLong(JsonNode node) {
    if (node == null || node.isNull() || node.isMissingNode()) {
      return null;
    }
    if (node.isNumber()) {
      return node.asLong();
    }
    try {
      String text = node.asText("").trim();
      return text.isEmpty() || "null".equalsIgnoreCase(text) ? null : Long.parseLong(text);
    } catch (NumberFormatException e) {
      return null;
    }
  }

  private String textOrNull(JsonNode root, String field) {
    return root == null ? null : textValue(root, field);
  }

  private String textValue(JsonNode node, String field) {
    if (node == null) {
      return null;
    }
    JsonNode value = node.path(field);
    return value.isMissingNode() || value.isNull() ? null : value.asText(null);
  }

  private String truncate(String value, int max) {
    if (value == null) {
      return "";
    }
    return value.length() <= max ? value : value.substring(0, max) + "…";
  }
}