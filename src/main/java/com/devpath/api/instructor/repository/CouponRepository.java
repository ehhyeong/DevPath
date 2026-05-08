package com.devpath.api.instructor.repository;

import com.devpath.api.instructor.entity.Coupon;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CouponRepository extends JpaRepository<Coupon, Long> {

  boolean existsByCouponCode(String couponCode);

  List<Coupon> findByInstructorIdAndIsDeletedFalse(Long instructorId);
}
