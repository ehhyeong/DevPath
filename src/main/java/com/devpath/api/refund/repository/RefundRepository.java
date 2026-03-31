package com.devpath.api.refund.repository;

import com.devpath.api.refund.entity.RefundRequest;
import com.devpath.api.refund.entity.RefundStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefundRepository extends JpaRepository<RefundRequest, Long> {

    List<RefundRequest> findByLearnerIdAndIsDeletedFalseOrderByRequestedAtDesc(Long learnerId);

    Optional<RefundRequest> findByIdAndIsDeletedFalse(Long id);

    // 같은 강의에 진행 중이거나 승인된 환불 요청이 있으면 중복 요청을 막는다.
    boolean existsByLearnerIdAndCourseIdAndStatusInAndIsDeletedFalse(
            Long learnerId,
            Long courseId,
            Collection<RefundStatus> statuses
    );
}
