package com.devpath.domain.refund.repository;

import com.devpath.domain.refund.entity.RefundReview;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefundReviewRepository extends JpaRepository<RefundReview, Long> {

  List<RefundReview> findAllByRefundRequestIdOrderByProcessedAtDesc(Long refundRequestId);
}
