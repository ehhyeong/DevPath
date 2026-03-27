package com.devpath.api.refund.dto;

import com.devpath.api.refund.entity.RefundRequest;
import com.devpath.api.refund.entity.RefundStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class RefundResponse {

    private Long id;
    private Long learnerId;
    private Long courseId;
    private String reason;
    private RefundStatus status;
    private LocalDateTime requestedAt;
    private LocalDateTime processedAt;

    public static RefundResponse from(RefundRequest refundRequest) {
        return RefundResponse.builder()
                .id(refundRequest.getId())
                .learnerId(refundRequest.getLearnerId())
                .courseId(refundRequest.getCourseId())
                .reason(refundRequest.getReason())
                .status(refundRequest.getStatus())
                .requestedAt(refundRequest.getRequestedAt())
                .processedAt(refundRequest.getProcessedAt())
                .build();
    }
}