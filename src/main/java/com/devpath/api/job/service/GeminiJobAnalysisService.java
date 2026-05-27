package com.devpath.api.job.service;

import com.devpath.api.job.dto.GeminiJobAnalysisResponse;
import com.devpath.api.job.dto.JobActivityProfileResponse;
import com.devpath.api.job.dto.JobkoreaJobRequest;
import com.devpath.api.job.dto.JobkoreaJobResponse;
import com.devpath.common.provider.GeminiProvider;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class GeminiJobAnalysisService {

  private static final int MAX_JOBS_FOR_ANALYSIS = 10;
  private static final int MAX_KEYWORDS_IN_PROMPT = 5;
  private static final ObjectMapper MAPPER = new ObjectMapper();

  private final JobActivityProfileService jobActivityProfileService;
  private final JobkoreaApiClient jobkoreaApiClient;
  private final GeminiProvider geminiProvider;

  /**
   * 사용자 활동 프로필과 잡코리아 채용공고를 기반으로 Gemini AI 분석을 수행한다. 실패 시 RuntimeException을 던져 호출부(컨트롤러)에서 HTTP 오류로
   * 처리한다. 프론트엔드는 HTTP 오류를 감지해 기존 rule-based 로직으로 fallback한다.
   */
  public GeminiJobAnalysisResponse.Analysis analyze(
      Long userId, String keyword, String areaCode, String jobCode) {

    JobActivityProfileResponse.Summary profile = fetchProfile(userId);
    List<JobkoreaJobResponse.Posting> postings = fetchPostings(keyword, areaCode, jobCode);

    if (postings.isEmpty()) {
      throw new RuntimeException("분석할 채용공고가 없습니다.");
    }

    String prompt = buildPrompt(profile, postings);
    String raw = geminiProvider.generate(prompt);

    if (raw == null) {
      throw new RuntimeException("Gemini 응답이 없습니다.");
    }

    List<GeminiJobAnalysisResponse.RecommendedPosting> recommendations = parseAndMap(raw, postings);

    return new GeminiJobAnalysisResponse.Analysis(recommendations, true, null);
  }

  private JobActivityProfileResponse.Summary fetchProfile(Long userId) {
    if (userId == null) {
      return null;
    }
    try {
      return jobActivityProfileService.getMyActivityProfile(userId);
    } catch (Exception e) {
      log.warn("[GeminiJobAnalysis] 프로필 조회 실패: {}", e.getMessage());
      return null;
    }
  }

  private List<JobkoreaJobResponse.Posting> fetchPostings(
      String keyword, String areaCode, String jobCode) {
    try {
      JobkoreaJobRequest.Search request =
          new JobkoreaJobRequest.Search(
              MAX_JOBS_FOR_ANALYSIS, 1, 1, keyword, "10031", jobCode, areaCode, false);
      JobkoreaJobResponse.SearchResult result = jobkoreaApiClient.search(request);
      List<JobkoreaJobResponse.Posting> items = result.items();
      return items != null ? items.stream().limit(MAX_JOBS_FOR_ANALYSIS).toList() : List.of();
    } catch (Exception e) {
      log.warn("[GeminiJobAnalysis] 잡코리아 조회 실패: {}", e.getMessage());
      return List.of();
    }
  }

  private String buildPrompt(
      JobActivityProfileResponse.Summary profile, List<JobkoreaJobResponse.Posting> postings) {

    StringBuilder sb = new StringBuilder();
    sb.append("당신은 IT 채용 매칭 전문가입니다. 아래 채점 기준에 따라 개발자 프로필과 채용공고의 적합도를 평가하세요.\n\n");

    sb.append("## 개발자 프로필\n");
    if (profile != null && !profile.skillSignals().isEmpty()) {
      sb.append("- 보유 기술: ").append(String.join(", ", profile.skillSignals())).append("\n");
      sb.append("- 프로젝트 수: ").append(profile.projectCount()).append("개\n");
      sb.append("- Proof Card: ").append(profile.proofCardCount()).append("개");
      if (profile.averageProofCardScore() > 0) {
        sb.append(" (평균 점수: ").append(profile.averageProofCardScore()).append("점)");
      }
      sb.append("\n");
    } else {
      sb.append("- 신규 사용자 (학습 이력 없음)\n");
    }

    sb.append("\n## 채용공고 목록 (총 ").append(postings.size()).append("건)\n");
    for (int i = 0; i < postings.size(); i++) {
      JobkoreaJobResponse.Posting p = postings.get(i);
      String company = p.companyName() != null ? p.companyName() : "기업명 미공개";
      String title = p.title() != null ? p.title() : "채용공고";
      sb.append(i).append(". [").append(company).append("] ").append(title).append(" | 키워드: ");
      if (p.keywords() != null && !p.keywords().isEmpty()) {
        sb.append(
            String.join(
                ", ",
                p.keywords().stream()
                    .filter(k -> k != null && !k.isBlank())
                    .limit(MAX_KEYWORDS_IN_PROMPT)
                    .toList()));
      } else {
        sb.append("미제공");
      }
      sb.append("\n");
    }

    sb.append("\n## 채점 기준 (합계 100점)\n");
    sb.append("### 1. 스킬 키워드 매칭 (60점 만점)\n");
    sb.append("- 공고 키워드 중 보유 기술과 일치하는 비율로 산정\n");
    sb.append("- 70% 이상 일치 → 54~60점 / 40~70% → 30~53점 / 40% 미만 → 0~29점\n");
    sb.append("- 보유 기술 없거나 키워드 미제공 → 20점 고정\n");

    sb.append("### 2. 학습 깊이 (25점 만점)\n");
    sb.append("- Proof Card 5개 이상 + 평균 80점↑ → 21~25점\n");
    sb.append("- Proof Card 3~4개 또는 평균 60~79점 → 13~20점\n");
    sb.append("- Proof Card 1~2개 또는 평균 60점 미만 → 5~12점\n");
    sb.append("- Proof Card 없음 → 0점\n");

    sb.append("### 3. 프로젝트 경험 (15점 만점)\n");
    sb.append("- 프로젝트 3개 이상 → 13~15점\n");
    sb.append("- 프로젝트 1~2개 → 6~12점\n");
    sb.append("- 프로젝트 없음 → 0점\n");

    sb.append("\n## 점수 구간 기준\n");
    sb.append("- 80~100: 핵심 기술 70%↑ 일치, 즉시 지원 추천\n");
    sb.append("- 60~79: 핵심 기술 40~70% 일치, 보완 학습 후 지원 가능\n");
    sb.append("- 40~59: 기술 일치 낮음, 장기 목표로 고려\n");
    sb.append("- 0~39: 기술 스택 불일치, 비추천\n");

    sb.append("\n## 응답 규칙\n");
    sb.append("- 순수 JSON 배열만 반환하세요. 설명, 마크다운 코드블록 없이.\n");
    sb.append("- 형식: [{\"index\": 0, \"matchScore\": 87, \"reason\": \"추천 이유\"}]\n");
    sb.append("- matchScore: 위 채점 기준 3개 항목 합산 0~100 정수\n");
    sb.append("- reason: 점수의 주요 근거를 30자 이내 한국어로 (예: \"Spring·JPA 일치, 프로젝트 경험 풍부\")\n");
    sb.append("- 모든 공고(").append(postings.size()).append("건)에 대해 응답 필수\n");

    return sb.toString();
  }

  private List<GeminiJobAnalysisResponse.RecommendedPosting> parseAndMap(
      String raw, List<JobkoreaJobResponse.Posting> postings) {

    String cleaned = stripToJsonArray(raw);

    try {
      JsonNode array = MAPPER.readTree(cleaned);
      if (!array.isArray()) {
        throw new RuntimeException("Gemini 응답이 JSON 배열 형식이 아닙니다.");
      }

      List<GeminiJobAnalysisResponse.RecommendedPosting> result = new ArrayList<>();
      for (JsonNode node : array) {
        int index = node.path("index").asInt(-1);
        if (index < 0 || index >= postings.size()) {
          continue;
        }
        int matchScore = Math.max(0, Math.min(100, node.path("matchScore").asInt(50)));
        String reason = node.path("reason").asText("");

        JobkoreaJobResponse.Posting p = postings.get(index);
        result.add(
            new GeminiJobAnalysisResponse.RecommendedPosting(
                p.externalId(),
                p.companyName(),
                p.title(),
                p.keywords(),
                p.areaCode(),
                p.careerCode(),
                p.deadline(),
                p.postedDate(),
                p.jobkoreaUrl(),
                resolveScore(matchScore, p),
                reason.isBlank() ? null : reason));
      }

      result.sort((a, b) -> Integer.compare(b.aiMatchScore(), a.aiMatchScore()));
      return result;

    } catch (Exception e) {
      throw new RuntimeException("Gemini 응답 파싱 실패: " + e.getMessage(), e);
    }
  }

  /** 스코어링 교체 포인트. 현재는 Gemini 점수를 그대로 사용한다. 추후 정밀 알고리즘(스킬 매칭 가중치 등)으로 교체 시 이 메서드만 수정한다. */
  private int resolveScore(int geminiScore, JobkoreaJobResponse.Posting posting) {
    // TODO: 추후 정밀 알고리즘으로 교체
    return geminiScore;
  }

  private String stripToJsonArray(String raw) {
    String cleaned = raw.trim();

    // 마크다운 코드블록 제거 (```json ... ``` 또는 ``` ... ```)
    if (cleaned.startsWith("```")) {
      int newline = cleaned.indexOf('\n');
      int closing = cleaned.lastIndexOf("```");
      if (newline >= 0 && closing > newline) {
        cleaned = cleaned.substring(newline + 1, closing).trim();
      }
    }

    // JSON 배열 범위 추출
    int start = cleaned.indexOf('[');
    int end = cleaned.lastIndexOf(']');
    if (start < 0 || end <= start) {
      throw new RuntimeException(
          "Gemini 응답에서 JSON 배열을 찾을 수 없습니다. raw=" + raw.substring(0, Math.min(200, raw.length())));
    }

    return cleaned.substring(start, end + 1);
  }

  @SuppressWarnings("unused")
  private int computeKeywordMatchScore(
      JobkoreaJobResponse.Posting posting, List<String> userSkills) {
    if (userSkills.isEmpty()) {
      return 55;
    }
    List<String> keywords = posting.keywords() != null ? posting.keywords() : List.of();
    long matchCount =
        keywords.stream()
            .filter(kw -> kw != null)
            .filter(
                kw ->
                    userSkills.stream()
                        .anyMatch(
                            skill ->
                                kw.toLowerCase(Locale.ROOT).contains(skill.toLowerCase(Locale.ROOT))
                                    || skill
                                        .toLowerCase(Locale.ROOT)
                                        .contains(kw.toLowerCase(Locale.ROOT))))
            .count();
    return (int) Math.min(95, 50 + matchCount * 12);
  }
}
