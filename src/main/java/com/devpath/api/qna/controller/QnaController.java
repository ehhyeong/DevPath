package com.devpath.api.qna.controller;

import com.devpath.api.qna.dto.AnswerCreateRequest;
import com.devpath.api.qna.dto.AnswerResponse;
import com.devpath.api.qna.dto.QuestionCreateRequest;
import com.devpath.api.qna.dto.QuestionDetailResponse;
import com.devpath.api.qna.dto.QuestionSummaryResponse;
import com.devpath.api.qna.dto.QuestionTemplateResponse;
import com.devpath.api.qna.service.QnaService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/qna")
@RequiredArgsConstructor
@Tag(name = "QnA API", description = "질문/답변 기반 Q&A 게시판 API")
public class QnaController {

    private final QnaService qnaService;

    @PostMapping("/questions")
    @Operation(summary = "질문 등록", description = "질문 템플릿과 난이도를 선택해 새로운 질문을 등록합니다.")
    public ApiResponse<QuestionDetailResponse> createQuestion(
            @Parameter(description = "질문 작성 사용자 ID", example = "1")
            @RequestParam Long userId,
            @Valid @RequestBody QuestionCreateRequest request
    ) {
        QuestionDetailResponse response = qnaService.createQuestion(userId, request);
        return ApiResponse.ok(response);
    }

    @GetMapping("/questions")
    @Operation(summary = "질문 목록 조회", description = "삭제되지 않은 질문 목록을 최신순으로 조회합니다.")
    public ApiResponse<List<QuestionSummaryResponse>> getQuestions() {
        List<QuestionSummaryResponse> responses = qnaService.getQuestions();
        return ApiResponse.ok(responses);
    }

    @GetMapping("/questions/{questionId}")
    @Operation(summary = "질문 상세 조회", description = "질문 상세와 답변 목록을 조회하고 조회수를 증가시킵니다.")
    public ApiResponse<QuestionDetailResponse> getQuestionDetail(
            @Parameter(description = "질문 ID", example = "10")
            @PathVariable Long questionId
    ) {
        QuestionDetailResponse response = qnaService.getQuestionDetail(questionId);
        return ApiResponse.ok(response);
    }

    @PostMapping("/questions/{questionId}/answers")
    @Operation(summary = "답변 등록", description = "특정 질문에 답변을 등록합니다.")
    public ApiResponse<AnswerResponse> createAnswer(
            @Parameter(description = "답변 작성 사용자 ID", example = "2")
            @RequestParam Long userId,
            @Parameter(description = "질문 ID", example = "10")
            @PathVariable Long questionId,
            @Valid @RequestBody AnswerCreateRequest request
    ) {
        AnswerResponse response = qnaService.createAnswer(userId, questionId, request);
        return ApiResponse.ok(response);
    }

    @PatchMapping("/questions/{questionId}/answers/{answerId}/adopt")
    @Operation(summary = "답변 채택", description = "질문 작성자만 특정 답변을 채택할 수 있습니다.")
    public ApiResponse<QuestionDetailResponse> adoptAnswer(
            @Parameter(description = "채택 요청 사용자 ID", example = "1")
            @RequestParam Long userId,
            @Parameter(description = "질문 ID", example = "10")
            @PathVariable Long questionId,
            @Parameter(description = "답변 ID", example = "30")
            @PathVariable Long answerId
    ) {
        QuestionDetailResponse response = qnaService.adoptAnswer(userId, questionId, answerId);
        return ApiResponse.ok(response);
    }

    @GetMapping("/templates")
    @Operation(summary = "질문 템플릿 조회", description = "질문 작성 시 사용할 수 있는 활성화된 템플릿 목록을 조회합니다.")
    public ApiResponse<List<QuestionTemplateResponse>> getQuestionTemplates() {
        List<QuestionTemplateResponse> responses = qnaService.getQuestionTemplates();
        return ApiResponse.ok(responses);
    }
}
