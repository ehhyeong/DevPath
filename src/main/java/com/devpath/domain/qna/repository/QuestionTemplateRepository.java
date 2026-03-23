package com.devpath.domain.qna.repository;

import com.devpath.domain.qna.entity.QuestionTemplate;
import com.devpath.domain.qna.entity.QuestionTemplateType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionTemplateRepository extends JpaRepository<QuestionTemplate, Long> {

    // 활성화된 질문 템플릿을 정렬 순서대로 조회한다.
    List<QuestionTemplate> findAllByIsActiveTrueOrderBySortOrderAscIdAsc();

    // 템플릿 타입이 실제로 활성화되어 있는지 검증한다.
    boolean existsByTemplateTypeAndIsActiveTrue(QuestionTemplateType templateType);
}
