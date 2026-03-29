package com.devpath.domain.learning.repository;

import com.devpath.domain.learning.entity.QuizAttempt;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {

    Optional<QuizAttempt> findByIdAndIsDeletedFalse(Long id);

    Optional<QuizAttempt> findTopByQuizIdAndLearnerIdAndIsDeletedFalseOrderByAttemptNumberDesc(
        Long quizId,
        Long learnerId
    );

    boolean existsByQuizIdAndLearnerIdAndCompletedAtIsNotNullAndIsPassedTrueAndIsDeletedFalse(
        Long quizId,
        Long learnerId
    );

    List<QuizAttempt> findAllByLearnerIdAndIsDeletedFalseOrderByCreatedAtDesc(Long learnerId);

    @Query("""
        select qa
        from QuizAttempt qa
        join fetch qa.quiz q
        join fetch q.roadmapNode rn
        join fetch qa.learner l
        where qa.isDeleted = false
          and rn.nodeId in :nodeIds
        order by qa.createdAt desc
        """)
    List<QuizAttempt> findAllByQuizRoadmapNodeNodeIdInAndIsDeletedFalseOrderByCreatedAtDesc(
        @Param("nodeIds") Collection<Long> nodeIds
    );
}
