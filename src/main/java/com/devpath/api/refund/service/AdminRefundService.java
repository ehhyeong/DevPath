package com.devpath.api.refund.service;

import com.devpath.api.notification.service.NotificationEventService;
import com.devpath.api.refund.dto.RefundProcessRequest;
import com.devpath.api.refund.dto.RefundResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.EnrollmentStatus;
import com.devpath.domain.course.repository.CourseEnrollmentRepository;
import com.devpath.domain.refund.entity.RefundRequest;
import com.devpath.domain.refund.entity.RefundReview;
import com.devpath.domain.refund.entity.RefundStatus;
import com.devpath.domain.refund.repository.RefundRepository;
import com.devpath.domain.refund.repository.RefundReviewRepository;
import com.devpath.domain.settlement.entity.Settlement;
import com.devpath.domain.settlement.entity.SettlementStatus;
import com.devpath.domain.settlement.repository.SettlementRepository;
import java.util.List;
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
            .findTopByLearnerIdAndCourseIdAndStatusAndIsDeletedFalseOrderByCreatedAtDesc(
                refundRequest.getLearnerId(), refundRequest.getCourseId(), SettlementStatus.PENDING)
            .orElseThrow(() -> new CustomException(ErrorCode.SETTLEMENT_NOT_FOUND));

    long deduction = Math.min(refundRequest.getRefundAmount(), settlement.getAmount());
    if (deduction > 0L) {
      settlement.deductAmount(deduction);
    }
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

  @Transactional(readOnly = true)
  public List<RefundResponse> getRefunds() {
    return refundRepository.findAllByIsDeletedFalseOrderByRequestedAtDesc().stream()
        .map(RefundResponse::from)
        .toList();
  }

  @Transactional(readOnly = true)
  public RefundResponse getRefund(Long refundId) {
    return RefundResponse.from(
        refundRepository
            .findByIdAndIsDeletedFalse(refundId)
            .orElseThrow(() -> new CustomException(ErrorCode.REFUND_NOT_FOUND)));
  }
}
