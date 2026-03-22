package com.devpath.api.recommendation.service;

import com.devpath.api.recommendation.dto.RecommendationHistoryResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.recommendation.RecommendationHistory;
import com.devpath.domain.learning.repository.recommendation.RecommendationHistoryRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecommendationHistoryService {

    private final RecommendationHistoryRepository recommendationHistoryRepository;
    private final UserRepository userRepository;

    public RecommendationHistoryResponse.ListResult getHistories(Long userId, Long recommendationId, Long nodeId) {
        validateUser(userId);

        List<RecommendationHistory> histories;
        if (recommendationId != null) {
            histories = recommendationHistoryRepository
                    .findAllByUserIdAndRecommendationIdOrderByCreatedAtDesc(userId, recommendationId);
        } else if (nodeId != null) {
            histories = recommendationHistoryRepository
                    .findAllByUserIdAndRoadmapNodeNodeIdOrderByCreatedAtDesc(userId, nodeId);
        } else {
            histories = recommendationHistoryRepository.findAllByUserIdOrderByCreatedAtDesc(userId);
        }

        return RecommendationHistoryResponse.ListResult.of(userId, histories);
    }

    private User validateUser(Long userId) {
        if (userId == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }

        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }
}
