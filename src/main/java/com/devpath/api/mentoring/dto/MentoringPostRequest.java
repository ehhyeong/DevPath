package com.devpath.api.mentoring.dto;

import com.devpath.domain.mentoring.entity.MentoringPostStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public class MentoringPostRequest {

  private MentoringPostRequest() {}

  @Schema(name = "MentoringPostCreateRequest", description = "멘토링 공고 등록 요청")
  public record Create(
      @Schema(hidden = true) Long mentorId,

      // 공고 목록과 상세 화면에 표시되는 제목이다.
      @Schema(description = "멘토링 공고 제목", example = "Spring Boot 포트폴리오 멘토링")
          @NotBlank(message = "제목은 필수입니다.")
          @Size(max = 150, message = "제목은 150자 이하여야 합니다.")
          String title,

      // 멘토링 진행 방식과 신청 조건을 설명한다.
      @Schema(description = "멘토링 공고 내용", example = "Spring Boot 기반 포트폴리오 프로젝트를 코드 리뷰 중심으로 멘토링합니다.")
          @NotBlank(message = "내용은 필수입니다.")
          String content,

      // 검색과 화면 표시용 기술 스택 문자열이다.
      @Schema(description = "필요 기술 스택", example = "Java, Spring Boot, JPA, PostgreSQL")
          @Size(max = 500, message = "필요 기술 스택은 500자 이하여야 합니다.")
          String requiredStacks,

      @Schema(description = "멘토링 분야", example = "Backend")
          @Size(max = 60, message = "멘토링 분야는 60자 이하여야 합니다.")
          String category,

      @Schema(description = "멘토링 유형", example = "study")
          @Size(max = 30, message = "멘토링 유형은 30자 이하여야 합니다.")
          String mentoringType,

      @Schema(description = "진행 기간 주차", example = "4")
          @Min(value = 1, message = "진행 기간은 1주 이상이어야 합니다.")
          @Max(value = 52, message = "진행 기간은 52주 이하여야 합니다.")
          Integer durationWeeks,

      @Schema(description = "주차별 커리큘럼", example = "요구사항 분석\\n핵심 기능 구현")
          String curriculum,

      @Schema(description = "모집 마감일", example = "2026-06-30")
          LocalDate deadlineAt,

      @Schema(description = "공고 상태", example = "OPEN")
          MentoringPostStatus status,

      // 추후 신청 승인 시 정원 초과 검증에 사용한다.
      @Schema(description = "최대 참여 인원", example = "5")
          @NotNull(message = "최대 참여 인원은 필수입니다.")
          @Min(value = 1, message = "최대 참여 인원은 1명 이상이어야 합니다.")
          @Max(value = 100, message = "최대 참여 인원은 100명 이하여야 합니다.")
          Integer maxParticipants) {}

  @Schema(name = "MentoringPostUpdateRequest", description = "멘토링 공고 수정 요청")
  public record Update(

      // 수정 시 빈 제목 저장을 막는다.
      @Schema(description = "멘토링 공고 제목", example = "Spring Boot 실전 멘토링")
          @NotBlank(message = "제목은 필수입니다.")
          @Size(max = 150, message = "제목은 150자 이하여야 합니다.")
          String title,

      // 공고 내용은 핵심 정보이므로 빈 문자열을 허용하지 않는다.
      @Schema(description = "멘토링 공고 내용", example = "JPA 성능 최적화와 API 설계를 함께 리뷰합니다.")
          @NotBlank(message = "내용은 필수입니다.")
          String content,

      // 기술 스택은 선택값이지만 길이는 제한한다.
      @Schema(description = "필요 기술 스택", example = "Java, Spring Boot, QueryDSL, Redis")
          @Size(max = 500, message = "필요 기술 스택은 500자 이하여야 합니다.")
          String requiredStacks,

      @Schema(description = "멘토링 분야", example = "Backend")
          @Size(max = 60, message = "멘토링 분야는 60자 이하여야 합니다.")
          String category,

      @Schema(description = "멘토링 유형", example = "study")
          @Size(max = 30, message = "멘토링 유형은 30자 이하여야 합니다.")
          String mentoringType,

      @Schema(description = "진행 기간 주차", example = "4")
          @Min(value = 1, message = "진행 기간은 1주 이상이어야 합니다.")
          @Max(value = 52, message = "진행 기간은 52주 이하여야 합니다.")
          Integer durationWeeks,

      @Schema(description = "주차별 커리큘럼", example = "요구사항 분석\\n핵심 기능 구현")
          String curriculum,

      @Schema(description = "모집 마감일", example = "2026-06-30")
          LocalDate deadlineAt,

      @Schema(description = "공고 상태", example = "OPEN")
          MentoringPostStatus status,

      // 비정상적인 정원 값 저장을 방지한다.
      @Schema(description = "최대 참여 인원", example = "6")
          @NotNull(message = "최대 참여 인원은 필수입니다.")
          @Min(value = 1, message = "최대 참여 인원은 1명 이상이어야 합니다.")
          @Max(value = 100, message = "최대 참여 인원은 100명 이하여야 합니다.")
          Integer maxParticipants) {}
}
