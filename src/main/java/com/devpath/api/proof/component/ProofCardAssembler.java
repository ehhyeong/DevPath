package com.devpath.api.proof.component;

import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.repository.CourseTagMapRepository;
import com.devpath.domain.learning.entity.proof.SkillEvidenceType;
import com.devpath.domain.user.entity.Tag;
import java.util.List;
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

  // 강의-태그 매핑 저장소다.
  private final CourseTagMapRepository courseTagMapRepository;

  // 강좌 기반 Proof Card 발급용 데이터를 조립한다.
  public AssembledProofCard assembleFromCourse(Course course) {
    String courseTitle = course.getTitle() != null ? course.getTitle() : "강좌";
    String title = buildTitle(courseTitle);
    String description = buildDescriptionFromCourse(courseTitle);

    List<AssembledTag> tags =
        courseTagMapRepository.findAllByCourseCourseId(course.getCourseId()).stream()
            .map(
                courseTagMap ->
                    AssembledTag.builder()
                        .tag(courseTagMap.getTag())
                        .evidenceType(SkillEvidenceType.VERIFIED)
                        .build())
            .toList();

    return AssembledProofCard.builder().title(title).description(description).tags(tags).build();
  }

  // 강좌 기반 카드 설명을 만든다.
  private String buildDescriptionFromCourse(String courseTitle) {
    String limitedTitle =
        limitText(buildConciseTitle(courseTitle), DESCRIPTION_NODE_MAX_LENGTH, "강좌 수강");
    return limitText(
        limitedTitle + " 강좌 수강 완료를 증명합니다.", DESCRIPTION_MAX_LENGTH, "강좌 수강 완료를 증명합니다.");
  }

  // 카드 제목을 만든다.
  private String buildTitle(String nodeTitle) {
    return buildConciseTitle(nodeTitle) + " Proof Card";
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