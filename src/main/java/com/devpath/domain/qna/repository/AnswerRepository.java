package com.devpath.domain.qna.repository;

import com.devpath.domain.qna.entity.Answer;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnswerRepository extends JpaRepository<Answer, Long> {

    // 특정 질문의 삭제되지 않은 답변을 작성 순으로 조회한다.
    List<Answer> findAllByQuestionIdAndIsDeletedFalseOrderByCreatedAtAsc(Long questionId);

    // 삭제되지 않은 답변만 단건 조회한다.
    Optional<Answer> findByIdAndIsDeletedFalse(Long answerId);

    // 특정 질문에 속한 삭제되지 않은 답변만 조회한다.
    Optional<Answer> findByQuestion_IdAndIdAndIsDeletedFalse(Long questionId, Long answerId);
}
