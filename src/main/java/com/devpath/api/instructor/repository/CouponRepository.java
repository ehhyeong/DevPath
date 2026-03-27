package com.devpath.api.instructor.repository;

import com.devpath.api.instructor.entity.Coupon;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CouponRepository extends JpaRepository<Coupon, Long> {

    List<Coupon> findByInstructorIdAndIsDeletedFalse(Long instructorId);
}