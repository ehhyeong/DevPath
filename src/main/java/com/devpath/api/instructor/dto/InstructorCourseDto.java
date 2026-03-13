package com.devpath.api.instructor.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.util.List;
import lombok.Getter;

// 강사용 강의 생성, 수정, 상태 변경, 메타데이터 관리 DTO를 제공한다.
public class InstructorCourseDto {

  // 강의 생성 요청 DTO다.
  @Getter
  @Schema(description = "강의 생성 요청 DTO")
  public static class CreateCourseRequest {

    @NotBlank(message = "강의 제목은 필수입니다.")
    @Schema(description = "강의 제목", example = "Spring Boot Security 완전 정복")
    private String title;

    @Schema(description = "강의 부제목", example = "JWT, OAuth2, Spring Security 실전 가이드")
    private String subtitle;

    @Schema(description = "강의 상세 설명", example = "Spring Security와 JWT 기반 인증 구조를 실전 중심으로 학습합니다.")
    private String description;

    @NotNull(message = "강의 가격은 필수입니다.")
    @DecimalMin(value = "0.0", inclusive = true, message = "강의 가격은 0 이상이어야 합니다.")
    @Schema(description = "판매가", example = "99000")
    private BigDecimal price;

    @DecimalMin(value = "0.0", inclusive = true, message = "강의 정가는 0 이상이어야 합니다.")
    @Schema(description = "정가", example = "129000")
    private BigDecimal originalPrice;

    @NotBlank(message = "통화 코드는 필수입니다.")
    @Schema(description = "통화 코드", example = "KRW")
    private String currency;

    @Schema(
        description = "난이도",
        example = "beginner",
        allowableValues = {"beginner", "intermediate", "advanced", "all"})
    private String difficultyLevel;

    @Schema(description = "강의 언어", example = "ko")
    private String language;

    @NotNull(message = "수료증 제공 여부는 필수입니다.")
    @Schema(description = "수료증 제공 여부", example = "true")
    private Boolean hasCertificate;

    @NotEmpty(message = "강의 태그는 최소 1개 이상 선택해야 합니다.")
    @Schema(description = "강의 태그 ID 목록", example = "[1, 2, 3]")
    private List<Long> tagIds;
  }

  // 강의 기본 정보 수정 요청 DTO다.
  @Getter
  @Schema(description = "강의 기본 정보 수정 요청 DTO")
  public static class UpdateCourseRequest {

    @NotBlank(message = "강의 제목은 필수입니다.")
    @Schema(description = "강의 제목", example = "Spring Boot Security 실전")
    private String title;

    @Schema(description = "강의 부제목", example = "실무에서 바로 쓰는 인증/인가 구현")
    private String subtitle;

    @Schema(description = "강의 상세 설명", example = "Spring Security와 JWT, OAuth2를 다루는 실전 강의입니다.")
    private String description;

    @NotNull(message = "강의 가격은 필수입니다.")
    @DecimalMin(value = "0.0", inclusive = true, message = "강의 가격은 0 이상이어야 합니다.")
    @Schema(description = "판매가", example = "79000")
    private BigDecimal price;

    @DecimalMin(value = "0.0", inclusive = true, message = "강의 정가는 0 이상이어야 합니다.")
    @Schema(description = "정가", example = "99000")
    private BigDecimal originalPrice;

    @NotBlank(message = "통화 코드는 필수입니다.")
    @Schema(description = "통화 코드", example = "KRW")
    private String currency;

    @Schema(
        description = "난이도",
        example = "intermediate",
        allowableValues = {"beginner", "intermediate", "advanced", "all"})
    private String difficultyLevel;

    @Schema(description = "강의 언어", example = "ko")
    private String language;

    @NotNull(message = "수료증 제공 여부는 필수입니다.")
    @Schema(description = "수료증 제공 여부", example = "true")
    private Boolean hasCertificate;
  }

  // 강의 상태 변경 요청 DTO다.
  @Getter
  @Schema(description = "강의 상태 변경 요청 DTO")
  public static class UpdateStatusRequest {

    @NotBlank(message = "강의 상태는 필수입니다.")
    @Schema(
        description = "강의 상태",
        example = "published",
        allowableValues = {"draft", "in_review", "published", "archived"})
    private String status;
  }

  // 강의 메타데이터 전체 교체 요청 DTO다.
  @Getter
  @Schema(description = "강의 메타데이터 전체 교체 요청 DTO")
  public static class UpdateMetadataRequest {

    @Schema(
        description = "선수지식 목록",
        example = "[\"Java 기본 문법\", \"HTTP 기초\", \"Spring Core\"]")
    private List<String> prerequisites;

    @Schema(
        description = "직무 연관성 목록",
        example = "[\"백엔드 개발자\", \"서버 엔지니어\", \"플랫폼 엔지니어\"]")
    private List<String> jobRelevance;

    @NotEmpty(message = "강의 태그는 최소 1개 이상 선택해야 합니다.")
    @Schema(description = "강의 태그 ID 목록", example = "[1, 4, 7]")
    private List<Long> tagIds;
  }

  // 강의 목표 전체 교체 요청 DTO다.
  @Getter
  @Schema(description = "강의 목표 전체 교체 요청 DTO")
  public static class ReplaceObjectivesRequest {

    @NotEmpty(message = "강의 목표는 최소 1개 이상 입력해야 합니다.")
    @Schema(
        description = "강의 목표 목록",
        example = "[\"JWT 인증 구조를 이해한다.\", \"Spring Security 필터 흐름을 설명할 수 있다.\"]")
    private List<String> objectives;
  }

  // 강의 수강 대상 전체 교체 요청 DTO다.
  @Getter
  @Schema(description = "강의 수강 대상 전체 교체 요청 DTO")
  public static class ReplaceTargetAudiencesRequest {

    @NotEmpty(message = "수강 대상은 최소 1개 이상 입력해야 합니다.")
    @Schema(description = "강의 수강 대상 목록", example = "[\"Spring Boot 입문자\", \"백엔드 취업 준비생\"]")
    private List<String> targetAudiences;
  }

  // 강의 썸네일 메타데이터 저장 요청 DTO다.
  @Getter
  @Schema(description = "강의 썸네일 업로드 메타 저장 요청 DTO")
  public static class UploadThumbnailRequest {

    @NotBlank(message = "썸네일 URL은 필수입니다.")
    @Schema(description = "썸네일 URL", example = "https://cdn.devpath.com/courses/thumbnails/course-1.png")
    private String thumbnailUrl;

    @Schema(description = "원본 파일명", example = "spring-security-thumbnail.png")
    private String originalFileName;
  }

  // 강의 트레일러 메타데이터 저장 요청 DTO다.
  @Getter
  @Schema(description = "강의 트레일러 업로드 메타 저장 요청 DTO")
  public static class UploadTrailerRequest {

    @NotBlank(message = "트레일러 URL은 필수입니다.")
    @Schema(description = "트레일러 URL", example = "https://cdn.devpath.com/courses/trailers/course-1.mp4")
    private String trailerUrl;

    @Schema(description = "비디오 에셋 키", example = "courses/trailers/course-1.mp4")
    private String videoAssetKey;

    @PositiveOrZero(message = "트레일러 길이는 0 이상이어야 합니다.")
    @Schema(description = "트레일러 길이(초)", example = "95")
    private Integer durationSeconds;

    @Schema(description = "원본 파일명", example = "spring-security-intro.mp4")
    private String originalFileName;
  }
}
    // 강의 생성 요청 DTO다.
    @Getter
    @Schema(description = "강의 생성 요청 DTO")
    public static class CreateCourseRequest {

        @NotBlank(message = "강의 제목은 필수입니다.")
        @Schema(description = "강의 제목", example = "Spring Boot Security 완전 정복")
        private String title;

        @Schema(description = "강의 부제목", example = "JWT, OAuth2, Spring Security 실전 가이드")
        private String subtitle;

        @Schema(description = "강의 상세 설명", example = "Spring Security와 JWT 기반 인증 구조를 실전 중심으로 학습합니다.")
        private String description;

        @NotNull(message = "강의 가격은 필수입니다.")
        @DecimalMin(value = "0.0", inclusive = true, message = "강의 가격은 0 이상이어야 합니다.")
        @Schema(description = "판매가", example = "99000")
        private BigDecimal price;

        @DecimalMin(value = "0.0", inclusive = true, message = "강의 정가는 0 이상이어야 합니다.")
        @Schema(description = "정가", example = "129000")
        private BigDecimal originalPrice;

        @NotBlank(message = "통화 코드는 필수입니다.")
        @Schema(description = "통화 코드", example = "KRW")
        private String currency;

        @Schema(
                description = "난이도",
                example = "beginner",
                allowableValues = {"beginner", "intermediate", "advanced", "all"})
        private String difficultyLevel;

        @Schema(description = "강의 언어", example = "ko")
        private String language;

        @NotNull(message = "수료증 제공 여부는 필수입니다.")
        @Schema(description = "수료증 제공 여부", example = "true")
        private Boolean hasCertificate;

        @NotEmpty(message = "강의 태그는 최소 1개 이상 선택해야 합니다.")
        @Schema(description = "강의 태그 ID 목록", example = "[1, 2, 3]")
        private List<Long> tagIds;
    }

    // 강의 기본 정보 수정 요청 DTO다.
    @Getter
    @Schema(description = "강의 기본 정보 수정 요청 DTO")
    public static class UpdateCourseRequest {

        @NotBlank(message = "강의 제목은 필수입니다.")
        @Schema(description = "강의 제목", example = "Spring Boot Security 실전")
        private String title;

        @Schema(description = "강의 부제목", example = "실무에서 바로 쓰는 인증/인가 구현")
        private String subtitle;

        @Schema(description = "강의 상세 설명", example = "Spring Security와 JWT, OAuth2를 다루는 실전 강의입니다.")
        private String description;

        @NotNull(message = "강의 가격은 필수입니다.")
        @DecimalMin(value = "0.0", inclusive = true, message = "강의 가격은 0 이상이어야 합니다.")
        @Schema(description = "판매가", example = "79000")
        private BigDecimal price;

        @DecimalMin(value = "0.0", inclusive = true, message = "강의 정가는 0 이상이어야 합니다.")
        @Schema(description = "정가", example = "99000")
        private BigDecimal originalPrice;

        @NotBlank(message = "통화 코드는 필수입니다.")
        @Schema(description = "통화 코드", example = "KRW")
        private String currency;

        @Schema(
                description = "난이도",
                example = "intermediate",
                allowableValues = {"beginner", "intermediate", "advanced", "all"})
        private String difficultyLevel;

        @Schema(description = "강의 언어", example = "ko")
        private String language;

        @NotNull(message = "수료증 제공 여부는 필수입니다.")
        @Schema(description = "수료증 제공 여부", example = "true")
        private Boolean hasCertificate;
    }

    // 강의 상태 변경 요청 DTO다.
    @Getter
    @Schema(description = "강의 상태 변경 요청 DTO")
    public static class UpdateStatusRequest {

        @NotBlank(message = "강의 상태는 필수입니다.")
        @Schema(
                description = "강의 상태",
                example = "published",
                allowableValues = {"draft", "in_review", "published", "archived"})
        private String status;
    }

    // 강의 메타데이터 전체 교체 요청 DTO다.
    @Getter
    @Schema(description = "강의 메타데이터 전체 교체 요청 DTO")
    public static class UpdateMetadataRequest {

        @Schema(
                description = "선수지식 목록",
                example = "[\"Java 기본 문법\", \"HTTP 기초\", \"Spring Core\"]")
        private List<String> prerequisites;

        @Schema(
                description = "직무 연관성 목록",
                example = "[\"백엔드 개발자\", \"서버 엔지니어\", \"플랫폼 엔지니어\"]")
        private List<String> jobRelevance;

        @NotEmpty(message = "강의 태그는 최소 1개 이상 선택해야 합니다.")
        @Schema(description = "강의 태그 ID 목록", example = "[1, 4, 7]")
        private List<Long> tagIds;
    }

    // 강의 목표 전체 교체 요청 DTO다.
    @Getter
    @Schema(description = "강의 목표 전체 교체 요청 DTO")
    public static class ReplaceObjectivesRequest {

        @NotEmpty(message = "강의 목표는 최소 1개 이상 입력해야 합니다.")
        @Schema(
                description = "강의 목표 목록",
                example = "[\"JWT 인증 구조를 이해한다.\", \"Spring Security 필터 흐름을 설명할 수 있다.\"]")
        private List<String> objectives;
    }

    // 강의 수강 대상 전체 교체 요청 DTO다.
    @Getter
    @Schema(description = "강의 수강 대상 전체 교체 요청 DTO")
    public static class ReplaceTargetAudiencesRequest {

        @NotEmpty(message = "수강 대상은 최소 1개 이상 입력해야 합니다.")
        @Schema(
                description = "강의 수강 대상 목록",
                example = "[\"Spring Boot 입문자\", \"백엔드 취업 준비생\"]")
        private List<String> targetAudiences;
    }

    // 강의 썸네일 메타데이터 저장 요청 DTO다.
    @Getter
    @Schema(description = "강의 썸네일 업로드 메타 저장 요청 DTO")
    public static class UploadThumbnailRequest {

        @NotBlank(message = "썸네일 URL은 필수입니다.")
        @Schema(description = "썸네일 URL", example = "https://cdn.devpath.com/courses/thumbnails/course-1.png")
        private String thumbnailUrl;

        @Schema(description = "원본 파일명", example = "spring-security-thumbnail.png")
        private String originalFileName;
    }

    // 강의 트레일러 메타데이터 저장 요청 DTO다.
    @Getter
    @Schema(description = "강의 트레일러 업로드 메타 저장 요청 DTO")
    public static class UploadTrailerRequest {

        @NotBlank(message = "트레일러 URL은 필수입니다.")
        @Schema(description = "트레일러 URL", example = "https://cdn.devpath.com/courses/trailers/course-1.mp4")
        private String trailerUrl;

        @Schema(description = "비디오 에셋 키", example = "courses/trailers/course-1.mp4")
        private String videoAssetKey;

        @PositiveOrZero(message = "트레일러 길이는 0 이상이어야 합니다.")
        @Schema(description = "트레일러 길이(초)", example = "95")
        private Integer durationSeconds;

        @Schema(description = "원본 파일명", example = "spring-security-intro.mp4")
        private String originalFileName;
    }
}
