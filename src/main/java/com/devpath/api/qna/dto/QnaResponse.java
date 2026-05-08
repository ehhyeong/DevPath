package com.devpath.api.qna.dto;

import com.devpath.domain.qna.entity.MentoringAnswer;
import com.devpath.domain.qna.entity.MentoringQuestion;
import com.devpath.domain.qna.entity.QuestionStatus;
import com.devpath.domain.qna.entity.WorkspaceAnswer;
import com.devpath.domain.qna.entity.WorkspaceQuestion;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;

public class QnaResponse {

  private QnaResponse() {}

  @Schema(name = "MentoringQuestionSummaryResponse", description = "멘토링 질문 목록 응답")
  public record MentoringQuestionSummary(
      @Schema(description = "질문 ID", example = "1") Long questionId,
      @Schema(description = "멘토링 ID", example = "1") Long mentoringId,
      @Schema(description = "작성자 ID", example = "2") Long writerId,
      @Schema(description = "작성자 이름", example = "이학습") String writerName,
      @Schema(description = "질문 제목", example = "PR 리뷰 기준이 궁금합니다.") String title,
      @Schema(description = "질문 상태", example = "WAITING") QuestionStatus status,
      @Schema(description = "작성일시", example = "2026-05-03T17:00:00") LocalDateTime createdAt) {

    // 멘토링 질문 목록에 필요한 요약 정보를 DTO로 변환한다.
    public static MentoringQuestionSummary from(MentoringQuestion question) {
      return new MentoringQuestionSummary(
          question.getId(),
          question.getMentoring().getId(),
          question.getWriter().getId(),
          question.getWriter().getName(),
          question.getTitle(),
          question.getStatus(),
          question.getCreatedAt());
    }
  }

  @Schema(name = "MentoringQuestionDetailResponse", description = "멘토링 질문 상세 응답")
  public record MentoringQuestionDetail(
      @Schema(description = "질문 ID", example = "1") Long questionId,
      @Schema(description = "멘토링 ID", example = "1") Long mentoringId,
      @Schema(description = "작성자 ID", example = "2") Long writerId,
      @Schema(description = "작성자 이름", example = "이학습") String writerName,
      @Schema(description = "질문 제목", example = "PR 리뷰 기준이 궁금합니다.") String title,
      @Schema(description = "질문 내용", example = "Service 계층에서 검증 로직을 어느 정도까지 처리해야 하나요?")
          String content,
      @Schema(description = "질문 상태", example = "ANSWERED") QuestionStatus status,
      @Schema(description = "답변 목록", example = "[{\"answerId\":1,\"writerName\":\"김멘토\"}]")
          List<AnswerDetail> answers,
      @Schema(description = "작성일시", example = "2026-05-03T17:00:00") LocalDateTime createdAt,
      @Schema(description = "수정일시", example = "2026-05-03T17:30:00") LocalDateTime updatedAt) {

    // 멘토링 질문 상세와 답변 목록을 함께 응답한다.
    public static MentoringQuestionDetail from(
        MentoringQuestion question, List<MentoringAnswer> answers) {
      return new MentoringQuestionDetail(
          question.getId(),
          question.getMentoring().getId(),
          question.getWriter().getId(),
          question.getWriter().getName(),
          question.getTitle(),
          question.getContent(),
          question.getStatus(),
          answers.stream().map(AnswerDetail::from).toList(),
          question.getCreatedAt(),
          question.getUpdatedAt());
    }
  }

  @Schema(name = "WorkspaceQuestionSummaryResponse", description = "워크스페이스 질문 목록 응답")
  public record WorkspaceQuestionSummary(
      @Schema(description = "질문 ID", example = "1") Long questionId,
      @Schema(description = "워크스페이스 ID", example = "1") Long workspaceId,
      @Schema(description = "작성자 ID", example = "2") Long writerId,
      @Schema(description = "작성자 이름", example = "이학습") String writerName,
      @Schema(description = "질문 제목", example = "ERD 설계 기준이 궁금합니다.") String title,
      @Schema(description = "질문 상태", example = "WAITING") QuestionStatus status,
      @Schema(description = "작성일시", example = "2026-05-03T17:00:00") LocalDateTime createdAt) {

    // 워크스페이스 질문 목록에 필요한 요약 정보를 DTO로 변환한다.
    public static WorkspaceQuestionSummary from(WorkspaceQuestion question) {
      return new WorkspaceQuestionSummary(
          question.getId(),
          question.getWorkspaceId(),
          question.getWriter().getId(),
          question.getWriter().getName(),
          question.getTitle(),
          question.getStatus(),
          question.getCreatedAt());
    }
  }

  @Schema(name = "WorkspaceQuestionDetailResponse", description = "워크스페이스 질문 상세 응답")
  public record WorkspaceQuestionDetail(
      @Schema(description = "질문 ID", example = "1") Long questionId,
      @Schema(description = "워크스페이스 ID", example = "1") Long workspaceId,
      @Schema(description = "작성자 ID", example = "2") Long writerId,
      @Schema(description = "작성자 이름", example = "이학습") String writerName,
      @Schema(description = "질문 제목", example = "ERD 설계 기준이 궁금합니다.") String title,
      @Schema(description = "질문 내용", example = "팀 ERD에서 중간 테이블을 어느 기준으로 분리해야 하나요?") String content,
      @Schema(description = "질문 상태", example = "ANSWERED") QuestionStatus status,
      @Schema(description = "답변 목록", example = "[{\"answerId\":1,\"writerName\":\"김멘토\"}]")
          List<AnswerDetail> answers,
      @Schema(description = "작성일시", example = "2026-05-03T17:00:00") LocalDateTime createdAt,
      @Schema(description = "수정일시", example = "2026-05-03T17:30:00") LocalDateTime updatedAt) {

    // 워크스페이스 질문 상세와 답변 목록을 함께 응답한다.
    public static WorkspaceQuestionDetail from(
        WorkspaceQuestion question, List<WorkspaceAnswer> answers) {
      return new WorkspaceQuestionDetail(
          question.getId(),
          question.getWorkspaceId(),
          question.getWriter().getId(),
          question.getWriter().getName(),
          question.getTitle(),
          question.getContent(),
          question.getStatus(),
          answers.stream().map(AnswerDetail::from).toList(),
          question.getCreatedAt(),
          question.getUpdatedAt());
    }
  }

  @Schema(name = "QnaAnswerDetailResponse", description = "Q&A 답변 응답")
  public record AnswerDetail(
      @Schema(description = "답변 ID", example = "1") Long answerId,
      @Schema(description = "답변 작성자 ID", example = "1") Long writerId,
      @Schema(description = "답변 작성자 이름", example = "김멘토") String writerName,
      @Schema(description = "답변 내용", example = "Service 계층에서 검증과 상태 변경을 처리하는 것이 좋습니다.")
          String content,
      @Schema(description = "답변 작성일시", example = "2026-05-03T17:30:00") LocalDateTime createdAt) {

    // 멘토링 답변을 공통 답변 DTO로 변환한다.
    public static AnswerDetail from(MentoringAnswer answer) {
      return new AnswerDetail(
          answer.getId(),
          answer.getWriter().getId(),
          answer.getWriter().getName(),
          answer.getContent(),
          answer.getCreatedAt());
    }

    // 워크스페이스 답변을 공통 답변 DTO로 변환한다.
    public static AnswerDetail from(WorkspaceAnswer answer) {
      return new AnswerDetail(
          answer.getId(),
          answer.getWriter().getId(),
          answer.getWriter().getName(),
          answer.getContent(),
          answer.getCreatedAt());
    }
  }

  @Schema(name = "QuestionStatusResponse", description = "질문 상태 응답")
  public record Status(
      @Schema(description = "질문 ID", example = "1") Long questionId,
      @Schema(description = "질문 상태", example = "CLOSED") QuestionStatus status) {

    // 멘토링 질문 상태 응답을 만든다.
    public static Status from(MentoringQuestion question) {
      return new Status(question.getId(), question.getStatus());
    }

    // 워크스페이스 질문 상태 응답을 만든다.
    public static Status from(WorkspaceQuestion question) {
      return new Status(question.getId(), question.getStatus());
    }
  }
}
