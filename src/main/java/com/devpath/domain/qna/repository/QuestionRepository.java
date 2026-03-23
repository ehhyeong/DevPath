package com.devpath.domain.qna.repository;

import com.devpath.domain.qna.entity.Question;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionRepository extends JpaRepository<Question, Long> {

    // 삭제되지 않은 질문만 최신순으로 조회한다.
    List<Question> findAllByIsDeletedFalseOrderByCreatedAtDesc();

    // 삭제되지 않은 질문만 단건 조회한다.
    Optional<Question> findByIdAndIsDeletedFalse(Long questionId);

    // 제목 키워드가 포함된 질문을 최신순으로 제한 조회한다.
    List<Question> findTop10ByIsDeletedFalseAndTitleContainingIgnoreCaseOrderByCreatedAtDesc(String titleKeyword);
}
