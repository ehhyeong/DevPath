package com.devpath.api.learning.service;

import com.devpath.api.learning.dto.RecommendationHistoryResponse;
import com.devpath.domain.learning.repository.recommendation.RecommendationHistoryRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RecommendationHistoryService {

    private final RecommendationHistoryRepository recommendationHistoryRepository;

    // 특정 학습자의 추천 상태 변경 이력을 최신순으로 조회한다.
    @Transactional(readOnly = true)
    public List<RecommendationHistoryResponse> getHistories(Long userId) {
        return recommendationHistoryRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(RecommendationHistoryResponse::from)
                .collect(Collectors.toList());
    }
}
