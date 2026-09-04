package com.devpath.api.qna.service;

import com.devpath.api.qna.dto.DuplicateQuestionSuggestionResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.qna.entity.Question;
import com.devpath.domain.qna.repository.QuestionRepository;
import java.text.Normalizer;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QnaDuplicateSuggestionService {

  private static final int DUPLICATE_SUGGESTION_LIMIT = 10;
  private static final int MAX_SEARCH_KEYWORDS = 5;
  private static final int MIN_MATCHED_KEYWORD_COUNT = 2;
  private static final double MIN_KEYWORD_MATCH_RATIO = 0.34;
  private static final Set<String> DUPLICATE_STOPWORDS =
      Set.of(
          "the", "and", "for", "with", "from", "이", "가", "은", "는", "을", "를", "에", "에서", "으로", "와",
          "과", "문제", "오류", "질문", "도움", "도와주세요", "해주세요", "관련");

  private final QuestionRepository questionRepository;

  public List<DuplicateQuestionSuggestionResponse> getDuplicateSuggestions(String title) {
    String normalizedTitle = normalizeTitle(title);
    List<String> keywords = extractKeywords(normalizedTitle);

    if (keywords.isEmpty()) {
      return List.of();
    }

    Map<Long, ScoredSuggestion> scoredSuggestions = new LinkedHashMap<>();

    for (String keyword : keywords.stream().limit(MAX_SEARCH_KEYWORDS).toList()) {
      List<Question> matchedQuestions =
          questionRepository
              .findTop10ByIsDeletedFalseAndTitleContainingIgnoreCaseOrderByCreatedAtDesc(keyword);

      for (Question matchedQuestion : matchedQuestions) {
        String normalizedCandidateTitle = normalizeTitle(matchedQuestion.getTitle());

        int matchedKeywordCount = countMatchedKeywords(normalizedCandidateTitle, keywords);
        double matchRatio = (double) matchedKeywordCount / keywords.size();

        boolean fullTitleSimilar =
            normalizedCandidateTitle.contains(normalizedTitle)
                || normalizedTitle.contains(normalizedCandidateTitle);

        if (!fullTitleSimilar
            && matchedKeywordCount < MIN_MATCHED_KEYWORD_COUNT
            && matchRatio < MIN_KEYWORD_MATCH_RATIO) {
          continue;
        }

        int score =
            calculateDuplicateScore(
                normalizedTitle,
                normalizedCandidateTitle,
                keywords,
                matchedKeywordCount,
                fullTitleSimilar);

        String matchedKeyword =
            resolveMatchedKeyword(normalizedCandidateTitle, keywords, fullTitleSimilar);

        scoredSuggestions.compute(
            matchedQuestion.getId(),
            (questionId, existing) -> {
              if (existing == null) {
                return new ScoredSuggestion(matchedQuestion, matchedKeyword, score);
              }

              if (score > existing.score()) {
                return new ScoredSuggestion(matchedQuestion, matchedKeyword, score);
              }

              if (score == existing.score()
                  && matchedQuestion.getCreatedAt().isAfter(existing.question().getCreatedAt())) {
                return new ScoredSuggestion(matchedQuestion, matchedKeyword, score);
              }

              return existing;
            });
      }
    }

    return scoredSuggestions.values().stream()
        .sorted(
            Comparator.comparingInt(ScoredSuggestion::score)
                .reversed()
                .thenComparing(s -> s.question().getCreatedAt(), Comparator.reverseOrder()))
        .limit(DUPLICATE_SUGGESTION_LIMIT)
        .map(s -> DuplicateQuestionSuggestionResponse.from(s.question(), s.matchedKeyword()))
        .toList();
  }

  // 중복 추천용 제목 입력을 정규화한다.
  private String normalizeTitle(String title) {
    if (title == null || title.isBlank()) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "중복 추천을 위한 title 값은 필수입니다.");
    }

    return Normalizer.normalize(title, Normalizer.Form.NFKC)
        .toLowerCase(Locale.ROOT)
        .replaceAll("[^\\p{L}\\p{N}\\s]", " ")
        .replaceAll("\\s+", " ")
        .trim();
  }

  // 불필요한 조사와 일반 단어를 제외한 검색 키워드를 추출한다.
  private List<String> extractKeywords(String normalizedTitle) {
    return List.of(normalizedTitle.split("\\s+")).stream()
        .map(String::trim)
        .filter(keyword -> !keyword.isBlank())
        .filter(keyword -> keyword.length() >= 2)
        .filter(keyword -> !DUPLICATE_STOPWORDS.contains(keyword))
        .distinct()
        .toList();
  }

  private int countMatchedKeywords(String normalizedCandidateTitle, List<String> keywords) {
    int count = 0;
    for (String keyword : keywords) {
      if (normalizedCandidateTitle.contains(keyword)) {
        count++;
      }
    }
    return count;
  }

  private int calculateDuplicateScore(
      String normalizedTitle,
      String normalizedCandidateTitle,
      List<String> keywords,
      int matchedKeywordCount,
      boolean fullTitleSimilar) {
    int score = 0;

    if (fullTitleSimilar) {
      score += 100;
    }

    score += matchedKeywordCount * 15;

    if (normalizedCandidateTitle.equals(normalizedTitle)) {
      score += 50;
    }

    Set<String> inputWords = new HashSet<>(keywords);
    Set<String> candidateWords = new HashSet<>(extractKeywords(normalizedCandidateTitle));
    candidateWords.retainAll(inputWords);

    score += candidateWords.size() * 10;

    return score;
  }

  private String resolveMatchedKeyword(
      String normalizedCandidateTitle, List<String> keywords, boolean fullTitleSimilar) {
    if (fullTitleSimilar) {
      return "title";
    }

    return keywords.stream()
        .filter(normalizedCandidateTitle::contains)
        .findFirst()
        .orElse("keyword");
  }

  private record ScoredSuggestion(Question question, String matchedKeyword, int score) {}
}
