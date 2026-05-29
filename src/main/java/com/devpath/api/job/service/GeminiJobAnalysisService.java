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

    return parseResponse(raw, postings);
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
    sb.append("- 순수 JSON 객체만 반환하세요. 설명, 마크다운 코드블록 없이.\n");
    sb.append("- 형식:\n");
    sb.append("{\n");
    sb.append("  \"matched\": [{\"index\": 0, \"matchScore\": 87, \"reason\": \"추천 이유\"}],\n");
    sb.append("  \"stretch\": [{\"index\": 4, \"matchScore\": 62, \"reason\": \"보완 후 지원 가능\", \"missingSkills\": [\"Docker\", \"AWS\"]}]\n");
    sb.append("}\n");
    sb.append("- matched: 점수 높은 순 최대 7건 (matchScore 70 이상 권장)\n");
    sb.append("- stretch: 점수 50~75 구간에서 몇 가지 스킬을 보완하면 지원 가능한 공고 최대 3건\n");
    sb.append("- stretch.missingSkills: 공고 키워드 중 사용자가 보유하지 않은 핵심 기술 1~3개 (영문)\n");
    sb.append("- matchScore: 위 채점 기준 3개 항목 합산 0~100 정수\n");
    sb.append("- reason: 30자 이내 한국어 (예: \"Spring·JPA 일치, 프로젝트 경험 풍부\")\n");
    sb.append("- matched와 stretch에는 서로 다른 공고 index를 사용할 것\n");

    return sb.toString();
  }

  private GeminiJobAnalysisResponse.Analysis parseResponse(
      String raw, List<JobkoreaJobResponse.Posting> postings) {

    String cleaned = stripToJson(raw);

    try {
      JsonNode root = MAPPER.readTree(cleaned);

      List<GeminiJobAnalysisResponse.RecommendedPosting> matched =
          parsePostingList(root.path("matched"), postings, false);
      List<GeminiJobAnalysisResponse.RecommendedPosting> stretch =
          parsePostingList(root.path("stretch"), postings, true);

      matched.sort((a, b) -> Integer.compare(b.aiMatchScore(), a.aiMatchScore()));

      return new GeminiJobAnalysisResponse.Analysis(matched, stretch, true, null);

    } catch (Exception e) {
      throw new RuntimeException("Gemini 응답 파싱 실패: " + e.getMessage(), e);
    }
  }

  private List<GeminiJobAnalysisResponse.RecommendedPosting> parsePostingList(
      JsonNode array, List<JobkoreaJobResponse.Posting> postings, boolean includesMissingSkills) {

    List<GeminiJobAnalysisResponse.RecommendedPosting> result = new ArrayList<>();
    if (array == null || array.isMissingNode() || !array.isArray()) {
      return result;
    }

    for (JsonNode node : array) {
      int index = node.path("index").asInt(-1);
      if (index < 0 || index >= postings.size()) {
        continue;
      }
      int matchScore = Math.max(0, Math.min(100, node.path("matchScore").asInt(50)));
      String reason = node.path("reason").asText("");

      List<String> missingSkills = new ArrayList<>();
      if (includesMissingSkills && node.has("missingSkills") && node.path("missingSkills").isArray()) {
        for (JsonNode skill : node.path("missingSkills")) {
          String s = skill.asText("").trim();
          if (!s.isBlank()) {
            missingSkills.add(s);
          }
        }
      }

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
              reason.isBlank() ? null : reason,
              missingSkills));
    }

    return result;
  }

  /** 스코어링 교체 포인트. 현재는 Gemini 점수를 그대로 사용한다. 추후 정밀 알고리즘(스킬 매칭 가중치 등)으로 교체 시 이 메서드만 수정한다. */
  private int resolveScore(int geminiScore, JobkoreaJobResponse.Posting posting) {
    // TODO: 추후 정밀 알고리즘으로 교체
    return geminiScore;
  }

  private String stripToJson(String raw) {
    String cleaned = raw.trim();

    // 마크다운 코드블록 제거 (```json ... ``` 또는 ``` ... ```)
    if (cleaned.startsWith("```")) {
      int newline = cleaned.indexOf('\n');
      int closing = cleaned.lastIndexOf("```");
      if (newline >= 0 && closing > newline) {
        cleaned = cleaned.substring(newline + 1, closing).trim();
      }
    }

    // JSON 객체 범위 추출
    int start = cleaned.indexOf('{');
    int end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return cleaned.substring(start, end + 1);
    }

    // fallback: 배열 형식으로도 시도 (이전 응답과의 하위 호환)
    int arrStart = cleaned.indexOf('[');
    int arrEnd = cleaned.lastIndexOf(']');
    if (arrStart >= 0 && arrEnd > arrStart) {
      // 배열을 matched 키로 감싸서 객체로 변환
      return "{\"matched\":" + cleaned.substring(arrStart, arrEnd + 1) + ",\"stretch\":[]}";
    }

    throw new RuntimeException(
        "Gemini 응답에서 JSON을 찾을 수 없습니다. raw=" + raw.substring(0, Math.min(200, raw.length())));
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
