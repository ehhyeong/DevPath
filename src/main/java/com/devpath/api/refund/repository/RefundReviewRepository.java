package com.devpath.api.refund.repository;

import com.devpath.api.refund.entity.RefundReview;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefundReviewRepository extends JpaRepository<RefundReview, Long> {

    List<RefundReview> findAllByRefundRequestIdOrderByProcessedAtDesc(Long refundRequestId);
}
