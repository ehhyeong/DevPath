package com.devpath.domain.learning.repository;

import com.devpath.domain.learning.entity.QuizQuestion;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, Long> {

    // soft delete 되지 않은 문항을 id 기준으로 단건 조회한다.
    Optional<QuizQuestion> findByIdAndIsDeletedFalse(Long id);

    // 특정 퀴즈의 문항 목록을 displayOrder 오름차순으로 조회한다.
    List<QuizQuestion> findAllByQuizIdAndIsDeletedFalseOrderByDisplayOrderAsc(Long quizId);
}
