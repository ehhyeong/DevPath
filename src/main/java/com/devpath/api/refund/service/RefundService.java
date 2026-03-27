package com.devpath.api.refund.service;

import com.devpath.api.refund.dto.RefundRequestDto;
import com.devpath.api.refund.dto.RefundResponse;
import com.devpath.api.refund.entity.RefundRequest;
import com.devpath.api.refund.repository.RefundRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class RefundService {

    private final RefundRepository refundRepository;

    public RefundResponse requestRefund(RefundRequestDto request, Long learnerId) {
        RefundRequest refundRequest = RefundRequest.builder()
                .learnerId(learnerId)
                .courseId(request.getCourseId())
                .reason(request.getReason())
                .build();
        RefundRequest saved = refundRepository.save(refundRequest);
        return RefundResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<RefundResponse> getMyRefunds(Long learnerId) {
        return refundRepository.findByLearnerIdAndIsDeletedFalse(learnerId).stream()
                .map(RefundResponse::from)
                .collect(Collectors.toList());
    }
}