package com.devpath.api.refund.service;

import com.devpath.api.refund.dto.RefundRequestDto;
import com.devpath.api.refund.dto.RefundResponse;
import com.devpath.api.refund.entity.RefundRequest;
import com.devpath.api.refund.entity.RefundStatus;
import com.devpath.api.refund.repository.RefundRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseEnrollment;
import com.devpath.domain.course.entity.EnrollmentStatus;
import com.devpath.domain.course.repository.CourseEnrollmentRepository;
import com.devpath.domain.course.repository.CourseRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class RefundService {

    private static final long REFUND_AVAILABLE_DAYS = 7L;
    private static final int MAX_REFUNDABLE_PROGRESS_PERCENT = 30;

    private final RefundRepository refundRepository;
    private final CourseRepository courseRepository;
    private final CourseEnrollmentRepository courseEnrollmentRepository;

    public RefundResponse requestRefund(RefundRequestDto request, Long learnerId) {
        CourseEnrollment enrollment = courseEnrollmentRepository.findByUser_IdAndCourse_CourseId(learnerId, request.getCourseId())
                .orElseThrow(() -> new CustomException(ErrorCode.ENROLLMENT_NOT_FOUND));

        // 취소/만료 수강 이력은 환불 요청 대상에서 제외한다.
        if (enrollment.getStatus() == EnrollmentStatus.CANCELLED || enrollment.getStatus() == EnrollmentStatus.EXPIRED) {
            throw new CustomException(ErrorCode.INVALID_STATUS_TRANSITION);
        }

        if (refundRepository.existsByLearnerIdAndCourseIdAndStatusInAndIsDeletedFalse(
                learnerId,
                request.getCourseId(),
                List.of(RefundStatus.PENDING, RefundStatus.APPROVED)
        )) {
            throw new CustomException(ErrorCode.DUPLICATE_RESOURCE);
        }

        LocalDateTime enrolledAt = enrollment.getEnrolledAt();
        Integer progressPercent = enrollment.getProgressPercentage() == null ? 0 : enrollment.getProgressPercentage();

        // 이번 주차 마감 기준으로 환불 기간은 7일로 고정한다.
        if (LocalDateTime.now().isAfter(enrolledAt.plusDays(REFUND_AVAILABLE_DAYS))) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        // 이번 주차 마감 기준으로 진도율 30% 초과 시 환불 불가로 고정한다.
        if (progressPercent > MAX_REFUNDABLE_PROGRESS_PERCENT) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new CustomException(ErrorCode.COURSE_NOT_FOUND));

        RefundRequest refundRequest = RefundRequest.builder()
                .learnerId(learnerId)
                .courseId(request.getCourseId())
                .instructorId(course.getInstructorId())
                .reason(request.getReason())
                .enrolledAt(enrolledAt)
                .progressPercentSnapshot(progressPercent)
                .refundAmount(course.getPrice() == null ? 0L : course.getPrice().longValue())
                .build();

        RefundRequest saved = refundRepository.save(refundRequest);
        return RefundResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<RefundResponse> getMyRefunds(Long learnerId) {
        return refundRepository.findByLearnerIdAndIsDeletedFalseOrderByRequestedAtDesc(learnerId)
                .stream()
                .map(RefundResponse::from)
                .toList();
    }
}
