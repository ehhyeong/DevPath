package com.devpath.common.swagger;

public final class SwaggerDocConstants {

    private SwaggerDocConstants() {
    }

    // Swagger 단독 테스트 시 사용할 더미 사용자 설명이다.
    public static final String DUMMY_USER_ID_DESCRIPTION =
            "Swagger 단독 테스트용 사용자 ID입니다. 예시로 1은 게시글/질문 작성자, 2는 댓글/답변 작성자로 사용하면 됩니다.";

    // 커뮤니티 카테고리 enum 설명이다.
    public static final String COMMUNITY_CATEGORY_DESCRIPTION =
            "커뮤니티 카테고리입니다. TECH_SHARE=기술 공유, CAREER=커리어·이직, FREE=자유게시판";

    // 질문 템플릿 enum 설명이다.
    public static final String QUESTION_TEMPLATE_TYPE_DESCRIPTION =
            "질문 템플릿 타입입니다. DEBUGGING=오류 재현, IMPLEMENTATION=구현 질문, CODE_REVIEW=코드 리뷰, CAREER=커리어, STUDY=학습, PROJECT=프로젝트";

    // 질문 난이도 enum 설명이다.
    public static final String QUESTION_DIFFICULTY_DESCRIPTION =
            "질문 난이도입니다. EASY=기초, MEDIUM=중간, HARD=심화";
}
