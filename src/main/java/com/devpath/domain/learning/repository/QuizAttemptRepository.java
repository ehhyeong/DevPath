package com.devpath.domain.learning.repository;

import com.devpath.domain.learning.entity.QuizAttempt;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {

    // soft delete 되지 않은 응시 기록을 id 기준으로 단건 조회한다.
    Optional<QuizAttempt> findByIdAndIsDeletedFalse(Long id);

    // 특정 퀴즈와 특정 학습자 기준으로 가장 최근 응시 회차를 조회한다.
    Optional<QuizAttempt> findTopByQuizIdAndLearnerIdAndIsDeletedFalseOrderByAttemptNumberDesc(
            Long quizId,
            Long learnerId
    );

    // 특정 학습자의 전체 응시 이력을 최신순으로 조회한다.
    List<QuizAttempt> findAllByLearnerIdAndIsDeletedFalseOrderByCreatedAtDesc(Long learnerId);
}
