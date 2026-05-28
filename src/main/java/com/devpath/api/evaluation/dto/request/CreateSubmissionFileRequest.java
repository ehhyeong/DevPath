package com.devpath.api.evaluation.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "학습자용 제출 파일 정보 요청 DTO")
public class CreateSubmissionFileRequest {

  // Evaluation Swagger 문서화 기준에 맞춘 제출 파일 정보 요청 DTO다.
  @NotBlank
  @Schema(description = "파일명", example = "README.md")
  private String fileName;

  @NotBlank
  @Schema(description = "파일 URL", example = "https://s3.example.com/devpath/README.md")
  private String fileUrl;

  @PositiveOrZero
  @Schema(description = "파일 크기(byte)", example = "2048")
  private Long fileSize;

  @Schema(description = "파일 타입 또는 확장자", example = "md")
  private String fileType;

  @Schema(description = "AI review text preview for readable files")
  private String textContent;

  @Builder
  public CreateSubmissionFileRequest(
      String fileName, String fileUrl, Long fileSize, String fileType, String textContent) {
    this.fileName = fileName;
    this.fileUrl = fileUrl;
    this.fileSize = fileSize;
    this.fileType = fileType;
    this.textContent = textContent;
  }
}
