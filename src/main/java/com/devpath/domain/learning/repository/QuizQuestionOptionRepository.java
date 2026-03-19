package com.devpath.domain.learning.repository;

import com.devpath.domain.learning.entity.QuizQuestionOption;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizQuestionOptionRepository extends JpaRepository<QuizQuestionOption, Long> {

    // soft delete 되지 않은 선택지를 id 기준으로 단건 조회한다.
    Optional<QuizQuestionOption> findByIdAndIsDeletedFalse(Long id);

    // 특정 문항의 선택지 목록을 displayOrder 오름차순으로 조회한다.
    List<QuizQuestionOption> findAllByQuestionIdAndIsDeletedFalseOrderByDisplayOrderAsc(Long questionId);
}
