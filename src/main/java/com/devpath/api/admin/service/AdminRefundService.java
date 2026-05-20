package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.refund.RefundProcessRequest;
import com.devpath.api.notification.service.NotificationEventService;
import com.devpath.api.refund.entity.RefundRequest;
import com.devpath.api.refund.entity.RefundReview;
import com.devpath.api.refund.entity.RefundStatus;
import com.devpath.api.refund.repository.RefundRepository;
import com.devpath.api.refund.repository.RefundReviewRepository;
import com.devpath.api.settlement.entity.Settlement;
import com.devpath.api.settlement.entity.SettlementStatus;
import com.devpath.api.settlement.repository.SettlementRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.EnrollmentStatus;
import com.devpath.domain.course.repository.CourseEnrollmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminRefundService {

  private final RefundRepository refundRepository;
  private final RefundReviewRepository refundReviewRepository;
  private final SettlementRepository settlementRepository;
  private final CourseEnrollmentRepository courseEnrollmentRepository;
  private final NotificationEventService notificationEventService;

  public void approveRefund(Long refundId, Long adminId, RefundProcessRequest request) {
    RefundRequest refundRequest =
        refundRepository
            .findByIdAndIsDeletedFalse(refundId)
            .orElseThrow(() -> new CustomException(ErrorCode.REFUND_NOT_FOUND));

    // 승인 시에는 HELD를 제외한 최신 PENDING 정산 금액에서만 차감한다.
    Settlement settlement =
        settlementRepository
            .findTopByInstructorIdAndStatusAndIsDeletedFalseOrderByCreatedAtDesc(
                refundRequest.getInstructorId(), SettlementStatus.PENDING)
            .orElseThrow(() -> new CustomException(ErrorCode.SETTLEMENT_NOT_FOUND));

    settlement.deductAmount(refundRequest.getRefundAmount());
    refundRequest.approve();

    // 환불 승인 완료 시 수강 이력은 취소 상태로 바꾼다.
    courseEnrollmentRepository
        .findByUser_IdAndCourse_CourseId(refundRequest.getLearnerId(), refundRequest.getCourseId())
        .ifPresent(
            enrollment -> {
              if (enrollment.getStatus() != EnrollmentStatus.CANCELLED) {
                enrollment.cancel();
              }
            });

    refundReviewRepository.save(
        RefundReview.builder()
            .refundRequestId(refundRequest.getId())
            .adminId(adminId)
            .decision(RefundStatus.APPROVED)
            .reason(request.getReason())
            .build());

    notificationEventService.notifyRefundProcessed(refundRequest.getLearnerId(), true);
  }

  public void rejectRefund(Long refundId, Long adminId, RefundProcessRequest request) {
    RefundRequest refundRequest =
        refundRepository
            .findByIdAndIsDeletedFalse(refundId)
            .orElseThrow(() -> new CustomException(ErrorCode.REFUND_NOT_FOUND));

    refundRequest.reject();

    refundReviewRepository.save(
        RefundReview.builder()
            .refundRequestId(refundRequest.getId())
            .adminId(adminId)
            .decision(RefundStatus.REJECTED)
            .reason(request.getReason())
            .build());

    notificationEventService.notifyRefundProcessed(refundRequest.getLearnerId(), false);
  }
}
