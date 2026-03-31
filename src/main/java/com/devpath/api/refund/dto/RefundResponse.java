package com.devpath.api.refund.dto;

import com.devpath.api.refund.entity.RefundRequest;
import com.devpath.api.refund.entity.RefundStatus;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RefundResponse {

    private Long id;
    private Long learnerId;
    private Long courseId;
    private Long instructorId;
    private String reason;
    private RefundStatus status;
    private LocalDateTime enrolledAt;
    private Integer progressPercentSnapshot;
    private Long refundAmount;
    private LocalDateTime requestedAt;
    private LocalDateTime processedAt;

    // 마이페이지에서는 요청 당시의 환불 기준 snapshot도 함께 보여준다.
    public static RefundResponse from(RefundRequest refundRequest) {
        return RefundResponse.builder()
                .id(refundRequest.getId())
                .learnerId(refundRequest.getLearnerId())
                .courseId(refundRequest.getCourseId())
                .instructorId(refundRequest.getInstructorId())
                .reason(refundRequest.getReason())
                .status(refundRequest.getStatus())
                .enrolledAt(refundRequest.getEnrolledAt())
                .progressPercentSnapshot(refundRequest.getProgressPercentSnapshot())
                .refundAmount(refundRequest.getRefundAmount())
                .requestedAt(refundRequest.getRequestedAt())
                .processedAt(refundRequest.getProcessedAt())
                .build();
    }
}
