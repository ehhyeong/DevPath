package com.devpath.api.resume.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class CareerProfileRequest {

  private CareerProfileRequest() {}

  @Schema(name = "CareerProfileCreateRequest", description = "채용 분석용 프로필 생성 요청")
  public record Create(
      @Schema(description = "사용자 ID", example = "2") @NotNull(message = "사용자 ID는 필수입니다.")
          Long userId,
      @Schema(description = "목표 직무", example = "Backend Developer")
          @NotBlank(message = "목표 직무는 필수입니다.")
          @Size(max = 100, message = "목표 직무는 100자 이하여야 합니다.")
          String targetRole,
      @Schema(description = "프로필 헤드라인", example = "문제 해결 중심의 백엔드 개발자")
          @NotBlank(message = "프로필 헤드라인은 필수입니다.")
          @Size(max = 150, message = "프로필 헤드라인은 150자 이하여야 합니다.")
          String headline,
      @Schema(description = "프로필 요약", example = "Spring Boot 기반 API 설계와 JPA 데이터 모델링에 강점이 있습니다.")
          @Size(max = 3000, message = "프로필 요약은 3000자 이하여야 합니다.")
          String summary) {}

  @Schema(name = "CareerProfileProofCardSelectRequest", description = "Proof Card 선택 요청")
  public record ProofCardSelect(
      @Schema(description = "Proof Card ID", example = "1")
          @NotNull(message = "Proof Card ID는 필수입니다.")
          Long proofCardId,
      @Schema(description = "Proof Card 제목", example = "Spring Boot 미션 통과")
          @NotBlank(message = "Proof Card 제목은 필수입니다.")
          @Size(max = 150, message = "Proof Card 제목은 150자 이하여야 합니다.")
          String title,
      @Schema(description = "Proof Card 요약", example = "JWT 인증 API와 예외 처리 구조를 구현하고 리뷰를 통과했습니다.")
          @Size(max = 3000, message = "Proof Card 요약은 3000자 이하여야 합니다.")
          String summary) {}

  @Schema(name = "CareerProfileProjectAddRequest", description = "프로젝트 경험 추가 요청")
  public record ProjectAdd(
      @Schema(description = "프로젝트 ID", example = "1") Long projectId,
      @Schema(description = "프로젝트명", example = "DevPath")
          @NotBlank(message = "프로젝트명은 필수입니다.")
          @Size(max = 150, message = "프로젝트명은 150자 이하여야 합니다.")
          String title,
      @Schema(description = "프로젝트 역할", example = "Backend Developer")
          @NotBlank(message = "프로젝트 역할은 필수입니다.")
          @Size(max = 100, message = "프로젝트 역할은 100자 이하여야 합니다.")
          String role,
      @Schema(description = "프로젝트 설명", example = "멘토링, PR 리뷰, 채용 공고 분석 API를 구현했습니다.")
          @NotBlank(message = "프로젝트 설명은 필수입니다.")
          @Size(max = 5000, message = "프로젝트 설명은 5000자 이하여야 합니다.")
          String description,
      @Schema(description = "사용 기술", example = "Java, Spring Boot, JPA, PostgreSQL")
          @Size(max = 1000, message = "사용 기술은 1000자 이하여야 합니다.")
          String skills) {}

  @Schema(name = "CareerProfileSkillAddRequest", description = "self-reported skill 입력 요청")
  public record SkillAdd(
      @Schema(description = "기술명", example = "Spring Boot")
          @NotBlank(message = "기술명은 필수입니다.")
          @Size(max = 100, message = "기술명은 100자 이하여야 합니다.")
          String name,
      @Schema(description = "숙련도", example = "INTERMEDIATE")
          @Size(max = 50, message = "숙련도는 50자 이하여야 합니다.")
          String level) {}

  @Schema(name = "CareerProfileSnapshotCreateRequest", description = "분석용 프로필 스냅샷 생성 요청")
  public record SnapshotCreate(
      @Schema(description = "스냅샷 메모", example = "백엔드 주니어 지원용 프로필 스냅샷")
          @Size(max = 500, message = "스냅샷 메모는 500자 이하여야 합니다.")
          String memo) {}
}
