package com.devpath.api.learning.service;

import com.devpath.api.learning.dto.RiskWarningResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.recommendation.RiskWarning;
import com.devpath.domain.learning.repository.recommendation.RiskWarningRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RiskWarningService {

    private final RiskWarningRepository riskWarningRepository;

    // 특정 학습자의 전체 리스크 경고 목록을 최신순으로 조회한다.
    @Transactional(readOnly = true)
    public List<RiskWarningResponse> getWarnings(Long userId, boolean unacknowledgedOnly) {
        List<RiskWarning> warnings = unacknowledgedOnly
                ? riskWarningRepository.findByUserIdAndIsAcknowledgedFalseOrderByCreatedAtDesc(userId)
                : riskWarningRepository.findByUserIdOrderByCreatedAtDesc(userId);

        return warnings.stream()
                .map(RiskWarningResponse::from)
                .collect(Collectors.toList());
    }

    // 학습자가 리스크 경고를 확인 처리한다.
    @Transactional
    public RiskWarningResponse acknowledgeWarning(Long userId, Long warningId) {
        RiskWarning warning = riskWarningRepository.findById(warningId)
                .orElseThrow(() -> new CustomException(ErrorCode.RISK_WARNING_NOT_FOUND));

        if (!warning.getUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }

        warning.acknowledge();
        return RiskWarningResponse.from(warning);
    }
}
