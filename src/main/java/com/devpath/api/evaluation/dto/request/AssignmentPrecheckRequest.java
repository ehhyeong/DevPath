package com.devpath.api.evaluation.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "학습자용 과제 precheck 요청 DTO")
public class AssignmentPrecheckRequest {

  // Evaluation Swagger 문서화 기준에 맞춘 과제 precheck 요청 DTO다.
  @Schema(
      description = "텍스트형 제출 내용을 미리 검증할 때 사용하는 제출 본문",
      example = "과제 설명에 맞춰 구현 내용과 실행 결과를 정리했습니다.")
  private String submissionText;

  @Schema(
      description = "URL형 제출을 미리 검증할 때 사용하는 제출 URL",
      example = "https://github.com/example/devpath-assignment")
  private String submissionUrl;

  @Schema(description = "README 포함 여부", example = "true")
  private Boolean hasReadme;

  @Schema(description = "테스트 통과 여부", example = "true")
  private Boolean testPassed;

  @Schema(description = "린트 통과 여부", example = "true")
  private Boolean lintPassed;

  @Valid
  @Schema(description = "제출 예정 파일 목록")
  private List<CreateSubmissionFileRequest> files = new ArrayList<>();

  @Builder
  public AssignmentPrecheckRequest(
      String submissionText,
      String submissionUrl,
      Boolean hasReadme,
      Boolean testPassed,
      Boolean lintPassed,
      List<CreateSubmissionFileRequest> files) {
    this.submissionText = submissionText;
    this.submissionUrl = submissionUrl;
    this.hasReadme = hasReadme;
    this.testPassed = testPassed;
    this.lintPassed = lintPassed;
    this.files = files == null ? new ArrayList<>() : files;
  }
}
