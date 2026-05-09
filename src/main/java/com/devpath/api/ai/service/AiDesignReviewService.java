package com.devpath.api.ai.service;

import com.devpath.api.ai.dto.AiDesignReviewRequest;
import com.devpath.api.ai.dto.AiDesignReviewResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.ai.entity.AiDesignReview;
import com.devpath.domain.ai.entity.AiDesignSuggestion;
import com.devpath.domain.ai.repository.AiDesignReviewRepository;
import com.devpath.domain.ai.repository.AiDesignSuggestionRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AiDesignReviewService {

  private static final String PROVIDER_NAME = "RULE_BASED_DESIGN";

  private final AiDesignReviewRepository aiDesignReviewRepository;
  private final AiDesignSuggestionRepository aiDesignSuggestionRepository;
  private final UserRepository userRepository;

  @Transactional
  public AiDesignReviewResponse.Detail createReview(
      Long requesterId, AiDesignReviewRequest.Create request) {
    User requester = getUser(requesterId);

    String summary = generateRuleBasedSummary(request.erdText(), request.apiSpecText());

    AiDesignReview review =
        AiDesignReview.builder()
            .requester(requester)
            .title(request.title())
            .erdText(request.erdText())
            .apiSpecText(request.apiSpecText())
            .summary(summary)
            .providerName(PROVIDER_NAME)
            .build();

    AiDesignReview savedReview = aiDesignReviewRepository.save(review);

    return AiDesignReviewResponse.Detail.from(savedReview, List.of());
  }

  public AiDesignReviewResponse.Detail getReview(Long reviewId) {
    AiDesignReview review = getActiveReview(reviewId);
    List<AiDesignSuggestion> suggestions =
        aiDesignSuggestionRepository.findAllByDesignReview_IdAndIsDeletedFalseOrderByCreatedAtAsc(
            reviewId);

    return AiDesignReviewResponse.Detail.from(review, suggestions);
  }

  @Transactional
  public AiDesignReviewResponse.SuggestionDetail createSuggestion(
      Long reviewId, Long createdByUserId, AiDesignReviewRequest.SuggestionCreate request) {
    AiDesignReview review = getActiveReview(reviewId);
    User createdBy = getUser(createdByUserId);

    AiDesignSuggestion suggestion =
        AiDesignSuggestion.builder()
            .designReview(review)
            .createdBy(createdBy)
            .category(request.category())
            .title(request.title())
            .content(request.content())
            .priority(request.priority())
            .build();

    return AiDesignReviewResponse.SuggestionDetail.from(
        aiDesignSuggestionRepository.save(suggestion));
  }

  public List<AiDesignReviewResponse.SuggestionDetail> getSuggestions(Long reviewId) {
    // 존재하지 않거나 삭제된 설계 리뷰 기준으로 제안 목록을 조회하지 않도록 막는다.
    getActiveReview(reviewId);

    return aiDesignSuggestionRepository
        .findAllByDesignReview_IdAndIsDeletedFalseOrderByCreatedAtAsc(reviewId)
        .stream()
        .map(AiDesignReviewResponse.SuggestionDetail::from)
        .toList();
  }

  private AiDesignReview getActiveReview(Long reviewId) {
    return aiDesignReviewRepository
        .findByIdAndIsDeletedFalse(reviewId)
        .orElseThrow(() -> new CustomException(ErrorCode.AIREVIEW_DESIGN_NOT_FOUND));
  }

  private User getUser(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }

  private String generateRuleBasedSummary(String erdText, String apiSpecText) {
    String normalizedErd = erdText.toLowerCase(Locale.ROOT);
    String normalizedApiSpec = apiSpecText.toLowerCase(Locale.ROOT);

    int score = 0;
    StringBuilder summary = new StringBuilder();

    summary.append("AI 설계 리뷰가 완료되었습니다. ");

    if (containsAny(normalizedErd, "is_deleted", "soft delete")) {
      score++;
      summary.append("Soft Delete 전략이 설계에 포함되어 있습니다. ");
    } else {
      summary.append("Soft Delete 전략 명시가 부족합니다. ");
    }

    if (containsAny(normalizedErd, "lazy", "fetchtype.lazy")) {
      score++;
      summary.append("JPA 지연 로딩 전략이 언급되어 있습니다. ");
    } else {
      summary.append("연관관계 FetchType.LAZY 전략 검토가 필요합니다. ");
    }

    if (containsAny(normalizedApiSpec, "apiresponse", "api response")) {
      score++;
      summary.append("공통 응답 포맷이 API 명세에 반영되어 있습니다. ");
    } else {
      summary.append("ApiResponse 공통 응답 포맷 명시가 필요합니다. ");
    }

    if (containsAny(normalizedApiSpec, "swagger", "@operation", "@schema")) {
      score++;
      summary.append("Swagger 문서화 기준이 일부 반영되어 있습니다. ");
    } else {
      summary.append("Swagger 문서화 기준을 API 명세에 추가하는 것이 좋습니다. ");
    }

    summary.append("설계 체크 점수는 ").append(score).append("/4입니다.");

    return summary.toString();
  }

  private boolean containsAny(String text, String... keywords) {
    for (String keyword : keywords) {
      if (text.contains(keyword)) {
        return true;
      }
    }

    return false;
  }
}
