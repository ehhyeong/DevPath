package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.refund.RefundProcessRequest;
import com.devpath.api.refund.entity.RefundRequest;
import com.devpath.api.refund.entity.RefundReview;
import com.devpath.api.refund.entity.RefundStatus;
import com.devpath.api.refund.repository.RefundRepository;
import com.devpath.api.refund.repository.RefundReviewRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminRefundService {

    private final RefundRepository refundRepository;
    private final RefundReviewRepository refundReviewRepository;

    public void approveRefund(Long refundId, Long adminId, RefundProcessRequest request) {
        RefundRequest refundRequest = refundRepository.findByIdAndIsDeletedFalse(refundId)
                .orElseThrow(() -> new CustomException(ErrorCode.REFUND_NOT_FOUND));

        refundRequest.approve();

        refundReviewRepository.save(
                RefundReview.builder()
                        .refundRequestId(refundRequest.getId())
                        .adminId(adminId)
                        .decision(RefundStatus.APPROVED)
                        .reason(request.getReason())
                        .build()
        );
    }

    public void rejectRefund(Long refundId, Long adminId, RefundProcessRequest request) {
        RefundRequest refundRequest = refundRepository.findByIdAndIsDeletedFalse(refundId)
                .orElseThrow(() -> new CustomException(ErrorCode.REFUND_NOT_FOUND));

        refundRequest.reject();

        refundReviewRepository.save(
                RefundReview.builder()
                        .refundRequestId(refundRequest.getId())
                        .adminId(adminId)
                        .decision(RefundStatus.REJECTED)
                        .reason(request.getReason())
                        .build()
        );
    }
}
