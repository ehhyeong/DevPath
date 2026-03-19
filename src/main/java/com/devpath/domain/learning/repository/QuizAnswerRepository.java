package com.devpath.domain.learning.repository;

import com.devpath.domain.learning.entity.QuizAnswer;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizAnswerRepository extends JpaRepository<QuizAnswer, Long> {

    // soft delete 되지 않은 답안을 id 기준으로 단건 조회한다.
    Optional<QuizAnswer> findByIdAndIsDeletedFalse(Long id);

    // 특정 응시에 속한 답안 전체를 생성 순서 기준으로 조회한다.
    List<QuizAnswer> findAllByAttemptIdAndIsDeletedFalseOrderByIdAsc(Long attemptId);
}
