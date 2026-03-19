package com.devpath.domain.learning.repository;

import com.devpath.domain.learning.entity.Rubric;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RubricRepository extends JpaRepository<Rubric, Long> {

    // soft delete 되지 않은 루브릭 항목을 id 기준으로 단건 조회한다.
    Optional<Rubric> findByIdAndIsDeletedFalse(Long id);

    // 특정 과제의 루브릭 목록을 displayOrder 오름차순으로 조회한다.
    List<Rubric> findAllByAssignmentIdAndIsDeletedFalseOrderByDisplayOrderAsc(Long assignmentId);
}
