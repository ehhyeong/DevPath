package com.devpath.api.resume.service;

import com.devpath.api.resume.dto.ResumeClinicRequest;
import com.devpath.api.resume.dto.ResumeClinicResponse;
import com.devpath.domain.resume.model.ResumeClinicGeneratedContent;
import com.devpath.domain.resume.model.ResumeClinicSourceType;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ResumeClinicService {

  public ResumeClinicResponse.StrengthSummary createStrengthSummary(
      ResumeClinicRequest.StrengthSummary request) {
    List<String> skills = parseCsv(request.skills());
    List<String> proofKeywords = parseCsv(request.proofCards());

    ResumeClinicGeneratedContent learningContent =
        generateLearningStrength(request.targetRole(), request.learningHistory(), skills);
    ResumeClinicGeneratedContent projectContent =
        generateProjectStrength(request.targetRole(), request.projectExperience(), skills);
    ResumeClinicGeneratedContent proofCardContent =
        generateProofCardStrength(request.targetRole(), request.proofCards(), proofKeywords);

    List<String> recommendedKeywords =
        mergeKeywords(
            learningContent.keywords(), projectContent.keywords(), proofCardContent.keywords());

    String overallSummary =
        request.targetRole()
            + " 직무에 필요한 "
            + joinTopKeywords(recommendedKeywords)
            + " 역량을 학습, 프로젝트, 검증 이력으로 함께 증명할 수 있습니다.";

    return new ResumeClinicResponse.StrengthSummary(
        request.targetRole(),
        skills,
        learningContent.content(),
        projectContent.content(),
        proofCardContent.content(),
        overallSummary,
        recommendedKeywords);
  }

  public ResumeClinicResponse.HighlightPoints createHighlightPoints(
      ResumeClinicRequest.HighlightPoints request) {
    List<String> skills = parseCsv(request.skills());
    List<String> jobKeywords = parseCsv(request.jobKeywords());
    List<String> proofKeywords = parseCsv(request.proofCards());
    List<String> matchedKeywords = mergeKeywords(skills, jobKeywords, proofKeywords);

    List<String> highlightPoints = new ArrayList<>();
    highlightPoints.add(request.targetRole() + " 직무와 직접 연결되는 핵심 기술 스택: " + joinTopKeywords(skills));
    highlightPoints.add("프로젝트 경험을 통해 API 설계, 예외 처리, 데이터 모델링 흐름을 직접 구현했습니다.");
    highlightPoints.add("Proof Card 기반으로 학습 완료가 아니라 검증된 수행 결과를 강조할 수 있습니다.");

    if (containsBackendKeyword(skills)) {
      highlightPoints.add("Spring Boot/JPA 기반 백엔드 구현 경험을 중심 강점으로 배치하는 것이 좋습니다.");
    }

    if (containsInfraKeyword(skills)) {
      highlightPoints.add("Docker, AWS, Redis 등 운영/인프라 키워드를 함께 제시하면 실무 적합도가 올라갑니다.");
    }

    List<String> bulletPoints =
        List.of(
            "- "
                + joinTopKeywords(skills)
                + " 기반으로 "
                + request.targetRole()
                + " 직무에 필요한 핵심 기능을 구현했습니다.",
            "- "
                + summarizeText(request.projectExperience())
                + " 경험을 통해 요구사항 분석부터 API 구현까지 수행했습니다.",
            "- "
                + defaultIfBlank(request.proofCards(), "검증 가능한 학습 결과")
                + "를 기반으로 문제 해결 역량을 증명했습니다.");

    return new ResumeClinicResponse.HighlightPoints(
        request.targetRole(), highlightPoints, bulletPoints, matchedKeywords);
  }

  public ResumeClinicResponse.PortfolioPhrases createPortfolioPhrases(
      ResumeClinicRequest.PortfolioPhrases request) {
    List<String> skills = parseCsv(request.skills());
    List<String> proofKeywords = parseCsv(request.proofCards());

    String headline =
        request.profileTitle() + " | " + request.targetRole() + " | " + joinTopKeywords(skills);

    String introduction =
        "저는 "
            + joinTopKeywords(skills)
            + "를 활용해 실제 서비스 흐름에 가까운 API를 설계하고 구현하는 "
            + request.targetRole()
            + " 지향 개발자입니다.";

    List<String> projectPhrases =
        List.of(
            "대표 프로젝트에서는 " + summarizeText(request.projectExperience()) + " 작업을 수행했습니다.",
            "기능 구현뿐 아니라 예외 처리, DTO 분리, 공통 응답, Swagger 문서화까지 고려했습니다.",
            "사용자 흐름이 끊기지 않도록 저장, 조회, 상태 변경 API를 일관된 구조로 설계했습니다.");

    List<String> proofCardPhrases =
        List.of(
            "Proof Card 이력: " + defaultIfBlank(request.proofCards(), "검증 가능한 학습 및 프로젝트 완료 이력"),
            "단순 학습 기록이 아니라 결과물과 검증 이력을 함께 제시할 수 있습니다.",
            "검증 키워드: " + joinTopKeywords(proofKeywords));

    List<String> closingPhrases =
        List.of(
            "앞으로도 서비스 안정성, 유지보수성, 보안성을 고려한 백엔드 개발을 지향합니다.",
            "학습한 기술을 프로젝트 결과물로 연결하고, 검증 가능한 이력으로 성장 과정을 증명하겠습니다.");

    return new ResumeClinicResponse.PortfolioPhrases(
        headline, introduction, projectPhrases, proofCardPhrases, closingPhrases);
  }

  private ResumeClinicGeneratedContent generateLearningStrength(
      String targetRole, String learningHistory, List<String> skills) {
    String content =
        "학습 이력에서는 "
            + joinTopKeywords(skills)
            + "를 중심으로 "
            + targetRole
            + " 직무에 필요한 기반 역량을 쌓았습니다. "
            + summarizeText(learningHistory);

    return new ResumeClinicGeneratedContent(
        ResumeClinicSourceType.LEARNING, "학습 이력 기반 강점", content, skills);
  }

  private ResumeClinicGeneratedContent generateProjectStrength(
      String targetRole, String projectExperience, List<String> skills) {
    String content =
        "프로젝트 이력에서는 "
            + targetRole
            + " 역할에 맞춰 "
            + joinTopKeywords(skills)
            + "를 실제 기능 구현에 적용했습니다. "
            + summarizeText(projectExperience);

    return new ResumeClinicGeneratedContent(
        ResumeClinicSourceType.PROJECT, "프로젝트 이력 기반 강점", content, skills);
  }

  private ResumeClinicGeneratedContent generateProofCardStrength(
      String targetRole, String proofCards, List<String> proofKeywords) {
    String content =
        "Proof Card 이력은 "
            + targetRole
            + " 직무 역량을 단순 주장보다 검증 가능한 결과로 보여줍니다. "
            + defaultIfBlank(proofCards, "완료한 미션, 리뷰 통과, 과제 제출 결과를 중심으로 강조할 수 있습니다.");

    return new ResumeClinicGeneratedContent(
        ResumeClinicSourceType.PROOF_CARD, "Proof Card 기반 강점", content, proofKeywords);
  }

  private List<String> parseCsv(String value) {
    if (isBlank(value)) {
      return List.of();
    }

    return List.of(value.split(",")).stream()
        .map(String::trim)
        .filter(text -> !text.isEmpty())
        .distinct()
        .toList();
  }

  private List<String> mergeKeywords(List<String> first, List<String> second, List<String> third) {
    Set<String> merged = new LinkedHashSet<>();
    merged.addAll(first);
    merged.addAll(second);
    merged.addAll(third);

    return merged.stream().filter(keyword -> !isBlank(keyword)).toList();
  }

  private String joinTopKeywords(List<String> keywords) {
    if (keywords == null || keywords.isEmpty()) {
      return "핵심 기술";
    }

    return keywords.stream().limit(5).reduce((left, right) -> left + ", " + right).orElse("핵심 기술");
  }

  private String summarizeText(String value) {
    if (isBlank(value)) {
      return "관련 경험을 구체적인 결과 중심으로 정리하면 좋습니다.";
    }

    String trimmed = value.trim();
    if (trimmed.length() <= 160) {
      return trimmed;
    }

    return trimmed.substring(0, 160) + "...";
  }

  private String defaultIfBlank(String value, String defaultValue) {
    return isBlank(value) ? defaultValue : value.trim();
  }

  private boolean containsBackendKeyword(List<String> skills) {
    return skills.stream()
        .map(skill -> skill.toLowerCase(Locale.ROOT))
        .anyMatch(
            skill ->
                skill.contains("spring")
                    || skill.contains("java")
                    || skill.contains("jpa")
                    || skill.contains("postgresql")
                    || skill.contains("redis"));
  }

  private boolean containsInfraKeyword(List<String> skills) {
    return skills.stream()
        .map(skill -> skill.toLowerCase(Locale.ROOT))
        .anyMatch(
            skill ->
                skill.contains("docker")
                    || skill.contains("aws")
                    || skill.contains("kubernetes")
                    || skill.contains("redis"));
  }

  private boolean isBlank(String value) {
    return value == null || value.trim().isEmpty();
  }
}
