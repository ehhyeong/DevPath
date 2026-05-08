package com.devpath.api.instructor.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "coupon")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Coupon {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private Long instructorId;

  @Column(unique = true, nullable = false)
  private String couponCode;

  @Column(nullable = false)
  private String couponTitle;

  private String discountType;

  private Long discountValue;

  private Long targetCourseId;

  private Integer maxUsageCount;

  @Builder.Default private Integer usageCount = 0;

  private LocalDateTime expiresAt;

  @Builder.Default private Boolean isDeleted = false;

  @CreatedDate private LocalDateTime createdAt;
}
