package com.devpath.api.proof.component;

import com.devpath.domain.learning.entity.clearance.NodeClearance;
import com.devpath.domain.learning.entity.proof.SkillEvidenceType;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.user.entity.Tag;
import com.devpath.domain.user.repository.TagRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

// Proof Card 제목과 태그를 조립한다.
@Component
@RequiredArgsConstructor
public class ProofCardAssembler {

  private static final int TITLE_TOPIC_MAX_LENGTH = 28;
  private static final int DESCRIPTION_NODE_MAX_LENGTH = 36;
  private static final int DESCRIPTION_MAX_LENGTH = 96;

  // 노드 필수 태그 저장소다.
  private final NodeRequiredTagRepository nodeRequiredTagRepository;

  // 유저 기술 스택 저장소다.
  private final UserTechStackRepository userTechStackRepository;

  // 태그 저장소다.
  private final TagRepository tagRepository;

  // Proof Card 발급용 데이터를 조립한다.
  public AssembledProofCard assemble(NodeClearance nodeClearance) {
    List<String> requiredTagNames =
        nodeRequiredTagRepository.findTagNamesByNodeId(nodeClearance.getNode().getNodeId());
    List<String> userTagNames =
        userTechStackRepository.findTagNamesByUserId(nodeClearance.getUser().getId());

    String title = buildTitle(nodeClearance.getNode().getTitle());
    String description = buildDescription(nodeClearance.getNode().getTitle());

    List<AssembledTag> tags = new ArrayList<>();
    Set<String> requiredTagSet = normalizeSet(requiredTagNames);
    Set<String> userTagSet = normalizeSet(userTagNames);

    for (String requiredTagName : requiredTagNames) {
      if (userTagSet.contains(normalize(requiredTagName))) {
        tagRepository
            .findByName(requiredTagName)
            .ifPresent(
                tag ->
                    tags.add(
                        AssembledTag.builder()
                            .tag(tag)
                            .evidenceType(SkillEvidenceType.VERIFIED)
                            .build()));
      }
    }

    int heldTagLimit = 5;

    for (String userTagName : userTagNames) {
      if (tags.stream().filter(tag -> SkillEvidenceType.HELD.equals(tag.getEvidenceType())).count()
          >= heldTagLimit) {
        break;
      }

      if (requiredTagSet.contains(normalize(userTagName))) {
        continue;
      }

      tagRepository
          .findByName(userTagName)
          .ifPresent(
              tag ->
                  tags.add(
                      AssembledTag.builder()
                          .tag(tag)
                          .evidenceType(SkillEvidenceType.HELD)
                          .build()));
    }

    return AssembledProofCard.builder().title(title).description(description).tags(tags).build();
  }

  // 카드 제목을 만든다.
  private String buildTitle(String nodeTitle) {
    return buildConciseTitle(nodeTitle) + " Proof Card";
  }

  // 카드 설명을 만든다.
  private String buildDescription(String nodeTitle) {
    String limitedNodeTitle =
        limitText(buildConciseTitle(nodeTitle), DESCRIPTION_NODE_MAX_LENGTH, "학습 완료");
    return limitText(
        limitedNodeTitle + " 학습 완료와 검증 조건 충족을 증명합니다.",
        DESCRIPTION_MAX_LENGTH,
        "학습 완료와 검증 조건 충족을 증명합니다.");
  }

  private String buildConciseTitle(String nodeTitle) {
    String title = normalizeDisplayText(nodeTitle);
    title = title.replaceFirst("^\\[[^\\]]+\\]\\s*", "");
    title = title.replaceFirst("^로드맵\\s*실전\\s*:\\s*", "");
    title = title.replaceFirst("^섹션\\s*마무리\\s*퀴즈\\s*:\\s*", "");
    title = title.replaceFirst("^실습\\s*과제\\s*:\\s*", "");
    title = title.replaceFirst("\\s*-\\s*\\d+\\s*(?i:QUIZ|ASSIGNMENT)\\s*$", "");
    title = title.replaceFirst("\\s*(?i:QUIZ|ASSIGNMENT)\\s*$", "");
    title = takeBeforeDelimiter(title, "|");
    title = takeBeforeDelimiter(title, "｜");
    title = takeBeforeDescriptiveColon(title);
    title = takeBeforeDelimiter(title, " - ");
    title = normalizeDisplayText(title);

    if (title.isBlank()) {
      title = "학습 완료";
    }

    return fitTitleWithoutEllipsis(title, TITLE_TOPIC_MAX_LENGTH);
  }

  private String takeBeforeDelimiter(String value, String delimiter) {
    int delimiterIndex = value.indexOf(delimiter);
    if (delimiterIndex < 0) {
      return value;
    }

    String prefix = normalizeDisplayText(value.substring(0, delimiterIndex));
    return prefix.codePointCount(0, prefix.length()) >= 2 ? prefix : value;
  }

  private String takeBeforeDescriptiveColon(String value) {
    int delimiterIndex = value.indexOf(":");
    if (delimiterIndex < 0) {
      delimiterIndex = value.indexOf("：");
    }
    if (delimiterIndex < 0) {
      return value;
    }

    String prefix = normalizeDisplayText(value.substring(0, delimiterIndex));
    int prefixLength = prefix.codePointCount(0, prefix.length());
    return prefixLength >= 2 && prefixLength <= TITLE_TOPIC_MAX_LENGTH ? prefix : value;
  }

  private String fitTitleWithoutEllipsis(String value, int maxLength) {
    String normalized = normalizeDisplayText(value);
    if (normalized.codePointCount(0, normalized.length()) <= maxLength) {
      return normalized;
    }

    StringBuilder fitted = new StringBuilder();
    for (String word : normalized.split(" ")) {
      String next = fitted.length() == 0 ? word : fitted + " " + word;
      if (next.codePointCount(0, next.length()) > maxLength) {
        break;
      }
      fitted.setLength(0);
      fitted.append(next);
    }

    if (fitted.length() > 0) {
      return fitted.toString();
    }

    int endIndex = normalized.offsetByCodePoints(0, maxLength);
    return normalized.substring(0, endIndex).stripTrailing();
  }

  private String limitText(String value, int maxLength, String fallback) {
    String normalized = normalizeDisplayText(value);
    if (normalized.isBlank()) {
      normalized = normalizeDisplayText(fallback);
    }

    int textLength = normalized.codePointCount(0, normalized.length());
    if (textLength <= maxLength) {
      return normalized;
    }

    int endIndex = normalized.offsetByCodePoints(0, Math.max(0, maxLength - 3));
    return normalized.substring(0, endIndex).stripTrailing() + "...";
  }

  private String normalizeDisplayText(String value) {
    return value == null ? "" : value.trim().replaceAll("\\s+", " ");
  }

  // 문자열 목록을 정규화된 Set으로 변환한다.
  private Set<String> normalizeSet(List<String> values) {
    Set<String> normalizedSet = new LinkedHashSet<>();

    for (String value : values) {
      normalizedSet.add(normalize(value));
    }

    return normalizedSet;
  }

  // 문자열을 비교 가능한 형태로 정규화한다.
  private String normalize(String value) {
    return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
  }

  // 조립된 Proof Card 데이터다.
  @Getter
  @Builder
  public static class AssembledProofCard {

    // 카드 제목이다.
    private String title;

    // 카드 설명이다.
    private String description;

    // 카드 태그 목록이다.
    private List<AssembledTag> tags;
  }

  // 조립된 태그 데이터다.
  @Getter
  @Builder
  public static class AssembledTag {

    // 태그 엔티티다.
    private Tag tag;

    // 태그 증빙 유형이다.
    private SkillEvidenceType evidenceType;
  }
}
