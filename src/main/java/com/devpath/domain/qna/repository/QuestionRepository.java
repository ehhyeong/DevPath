package com.devpath.domain.qna.repository;

import com.devpath.domain.qna.entity.QnaStatus;
import com.devpath.domain.qna.entity.Question;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuestionRepository extends JpaRepository<Question, Long> {

    List<Question> findAllByIsDeletedFalseOrderByCreatedAtDesc();

    Optional<Question> findByIdAndIsDeletedFalse(Long questionId);

    List<Question> findTop10ByIsDeletedFalseAndTitleContainingIgnoreCaseOrderByCreatedAtDesc(String titleKeyword);

    @Query("""
            SELECT q
            FROM Question q
            WHERE q.courseId IN (
                SELECT c.courseId
                FROM Course c
                WHERE c.instructorId = :instructorId
            )
            AND q.isDeleted = false
            ORDER BY q.createdAt DESC
            """)
    List<Question> findAllByInstructorIdAndIsDeletedFalse(@Param("instructorId") Long instructorId);

    @Query("""
            SELECT q
            FROM Question q
            WHERE q.courseId IN (
                SELECT c.courseId
                FROM Course c
                WHERE c.instructorId = :instructorId
            )
            AND q.isDeleted = false
            AND q.qnaStatus = :status
            ORDER BY q.createdAt DESC
            """)
    List<Question> findAllByInstructorIdAndQnaStatusAndIsDeletedFalse(
            @Param("instructorId") Long instructorId,
            @Param("status") QnaStatus status
    );

    // 질문 상세 조작은 담당 강사 소유 질문만 조회한다.
    @Query("""
            SELECT q
            FROM Question q
            WHERE q.id = :questionId
            AND q.isDeleted = false
            AND q.courseId IN (
                SELECT c.courseId
                FROM Course c
                WHERE c.instructorId = :instructorId
            )
            """)
    Optional<Question> findManagedQuestionByInstructorId(
            @Param("questionId") Long questionId,
            @Param("instructorId") Long instructorId
    );
}
