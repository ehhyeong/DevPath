package com.devpath.api.recommendation.service;

import com.devpath.api.recommendation.dto.RiskWarningResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.recommendation.RiskWarning;
import com.devpath.domain.learning.repository.recommendation.RiskWarningRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RiskWarningService {

    private final RiskWarningRepository riskWarningRepository;
    private final UserRepository userRepository;

    public RiskWarningResponse.ListResult getWarnings(Long userId, Boolean onlyUnacknowledged, Long nodeId) {
        validateUser(userId);

        List<RiskWarning> warnings;
        if (nodeId != null) {
            warnings = riskWarningRepository.findAllByUserIdAndRoadmapNodeNodeIdOrderByCreatedAtDesc(userId, nodeId);
        } else if (Boolean.TRUE.equals(onlyUnacknowledged)) {
            warnings = riskWarningRepository.findAllByUserIdAndIsAcknowledgedFalseOrderByCreatedAtDesc(userId);
        } else {
            warnings = riskWarningRepository.findAllByUserIdOrderByCreatedAtDesc(userId);
        }

        return RiskWarningResponse.ListResult.of(userId, warnings);
    }

    private User validateUser(Long userId) {
        if (userId == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }

        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }
}
