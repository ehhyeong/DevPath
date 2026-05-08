package com.devpath.domain.ai.repository;

import com.devpath.domain.ai.entity.AiDesignReview;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiDesignReviewRepository extends JpaRepository<AiDesignReview, Long> {

  // 설계 리뷰 단건 조회에서 요청자 정보를 함께 로딩한다.
  @EntityGraph(attributePaths = "requester")
  Optional<AiDesignReview> findByIdAndIsDeletedFalse(Long id);
}
