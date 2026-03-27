package com.devpath.api.refund.repository;

import com.devpath.api.refund.entity.RefundRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RefundRepository extends JpaRepository<RefundRequest, Long> {

    List<RefundRequest> findByLearnerIdAndIsDeletedFalse(Long learnerId);

    Optional<RefundRequest> findByIdAndIsDeletedFalse(Long id);
}