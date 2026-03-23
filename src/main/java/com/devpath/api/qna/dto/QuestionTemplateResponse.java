package com.devpath.api.qna.dto;

import com.devpath.domain.qna.entity.QuestionTemplate;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "질문 템플릿 응답 DTO")
public class QuestionTemplateResponse {

    @Schema(description = "질문 템플릿 타입", example = "DEBUGGING")
    private String templateType;

    @Schema(description = "템플릿 이름", example = "버그/에러 질문")
    private String name;

    @Schema(description = "템플릿 설명", example = "에러 원인 분석과 재현 조건을 명확히 적는 템플릿입니다.")
    private String description;

    @Schema(description = "작성 가이드 예시", example = "에러 로그, 재현 단계, 기대 동작, 실제 동작을 함께 적어주세요.")
    private String guideExample;

    @Schema(description = "표시 순서", example = "1")
    private int sortOrder;

    // 엔티티를 질문 템플릿 응답 DTO로 변환한다.
    public static QuestionTemplateResponse from(QuestionTemplate template) {
        return QuestionTemplateResponse.builder()
                .templateType(template.getTemplateType().name())
                .name(template.getName())
                .description(template.getDescription())
                .guideExample(template.getGuideExample())
                .sortOrder(template.getSortOrder())
                .build();
    }
}
