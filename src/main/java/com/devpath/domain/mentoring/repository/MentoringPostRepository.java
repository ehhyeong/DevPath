package com.devpath.domain.mentoring.repository;

import com.devpath.domain.mentoring.entity.MentoringPost;
import com.devpath.domain.mentoring.entity.MentoringPostStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MentoringPostRepository extends JpaRepository<MentoringPost, Long> {

  // 목록 응답에서 mentor 정보를 사용하므로 fetch join 대신 EntityGraph로 N+1을 줄인다.
  @EntityGraph(attributePaths = "mentor")
  List<MentoringPost> findAllByIsDeletedFalseOrderByCreatedAtDesc();

  // 상태 필터가 있는 목록 조회에서도 mentor를 함께 로딩한다.
  @EntityGraph(attributePaths = "mentor")
  List<MentoringPost> findAllByStatusAndIsDeletedFalseOrderByCreatedAtDesc(
      MentoringPostStatus status);

  // Soft Delete 된 공고는 단건 조회 대상에서 제외한다.
  @EntityGraph(attributePaths = "mentor")
  Optional<MentoringPost> findByIdAndIsDeletedFalse(Long id);
}
