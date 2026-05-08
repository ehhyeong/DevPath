package com.devpath.domain.qna.repository;

import com.devpath.domain.qna.entity.QnaStatus;
import com.devpath.domain.qna.entity.Question;
import com.devpath.domain.qna.entity.QuestionScope;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuestionRepository extends JpaRepository<Question, Long> {

  List<Question> findAllByIsDeletedFalseOrderByCreatedAtDesc();

  List<Question> findAllByCourseIdAndIsDeletedFalseOrderByCreatedAtDesc(Long courseId);

  List<Question> findAllByUser_IdAndIsDeletedFalseOrderByCreatedAtDesc(Long userId);

  List<Question> findAllByCourseIdAndUser_IdAndIsDeletedFalseOrderByCreatedAtDesc(
      Long courseId, Long userId);

  Optional<Question> findByIdAndIsDeletedFalse(Long questionId);

  Optional<Question> findByIdAndUser_IdAndIsDeletedFalse(Long questionId, Long userId);

  List<Question> findTop10ByIsDeletedFalseAndTitleContainingIgnoreCaseOrderByCreatedAtDesc(
      String titleKeyword);

  List<Question> findAllByQuestionScopeAndMentoringIdAndIsDeletedFalseOrderByCreatedAtDesc(
      QuestionScope questionScope, Long mentoringId);

  List<Question> findAllByQuestionScopeAndWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(
      QuestionScope questionScope, Long workspaceId);

  Optional<Question> findByIdAndQuestionScopeAndIsDeletedFalse(
      Long questionId, QuestionScope questionScope);

  @Query(
      """
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

  @Query(
      """
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
      @Param("instructorId") Long instructorId, @Param("status") QnaStatus status);

  @Query(
      """
            SELECT q
            FROM Question q
            WHERE q.courseId IN (
                SELECT c.courseId
                FROM Course c
                WHERE c.instructorId = :instructorId
            )
            AND q.isDeleted = false
            AND NOT EXISTS (
                SELECT 1
                FROM Answer a
                WHERE a.question.id = q.id
                AND a.isDeleted = false
            )
            ORDER BY q.createdAt DESC
            """)
  List<Question> findAllUnansweredByInstructorId(@Param("instructorId") Long instructorId);

  @Query(
      """
            SELECT q
            FROM Question q
            WHERE q.courseId IN (
                SELECT c.courseId
                FROM Course c
                WHERE c.instructorId = :instructorId
            )
            AND q.isDeleted = false
            AND EXISTS (
                SELECT 1
                FROM Answer a
                WHERE a.question.id = q.id
                AND a.isDeleted = false
            )
            ORDER BY q.createdAt DESC
            """)
  List<Question> findAllAnsweredByInstructorId(@Param("instructorId") Long instructorId);

  @Query(
      """
            SELECT COUNT(q)
            FROM Question q
            WHERE q.courseId IN (
                SELECT c.courseId
                FROM Course c
                WHERE c.instructorId = :instructorId
            )
            AND q.isDeleted = false
            AND q.qnaStatus = :status
            """)
  long countByInstructorIdAndQnaStatus(
      @Param("instructorId") Long instructorId, @Param("status") QnaStatus status);

  @Query(
      """
            SELECT COUNT(q)
            FROM Question q
            WHERE q.courseId IN (
                SELECT c.courseId
                FROM Course c
                WHERE c.instructorId = :instructorId
            )
            AND q.isDeleted = false
            AND NOT EXISTS (
                SELECT 1
                FROM Answer a
                WHERE a.question.id = q.id
                AND a.isDeleted = false
            )
            """)
  long countUnansweredByInstructorId(@Param("instructorId") Long instructorId);

  @Query(
      """
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
      @Param("questionId") Long questionId, @Param("instructorId") Long instructorId);

  long countByCourseIdAndIsDeletedFalse(Long courseId);

  long countByCourseIdAndQnaStatusAndIsDeletedFalse(Long courseId, QnaStatus status);

  @Query(
      """
            SELECT COUNT(q)
            FROM Question q
            WHERE q.courseId = :courseId
            AND q.isDeleted = false
            AND NOT EXISTS (
                SELECT 1
                FROM Answer a
                WHERE a.question.id = q.id
                AND a.isDeleted = false
            )
            """)
  long countUnansweredByCourseId(@Param("courseId") Long courseId);
}
