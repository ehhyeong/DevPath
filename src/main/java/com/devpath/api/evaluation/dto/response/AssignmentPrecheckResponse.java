package com.devpath.api.evaluation.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "과제 precheck 결과 응답 DTO")
public class AssignmentPrecheckResponse {

    // 전체 precheck 통과 여부다.
    @Schema(description = "전체 통과 여부", example = "true")
    private Boolean passed;

    // README 요구사항 통과 여부다.
    @Schema(description = "README 통과 여부", example = "true")
    private Boolean readmePassed;

    // 테스트 요구사항 통과 여부다.
    @Schema(description = "테스트 통과 여부", example = "true")
    private Boolean testPassed;

    // 린트 요구사항 통과 여부다.
    @Schema(description = "린트 통과 여부", example = "true")
    private Boolean lintPassed;

    // 허용 파일 형식 검증 통과 여부다.
    @Schema(description = "파일 형식 통과 여부", example = "true")
    private Boolean fileFormatPassed;

    // 자동검증 품질 점수다.
    @Schema(description = "품질 점수", example = "100")
    private Integer qualityScore;

    // precheck 결과 메시지다.
    @Schema(description = "결과 메시지", example = "precheck를 통과했습니다.")
    private String message;

    @Builder
    public AssignmentPrecheckResponse(
            Boolean passed,
            Boolean readmePassed,
            Boolean testPassed,
            Boolean lintPassed,
            Boolean fileFormatPassed,
            Integer qualityScore,
            String message
    ) {
        this.passed = passed;
        this.readmePassed = readmePassed;
        this.testPassed = testPassed;
        this.lintPassed = lintPassed;
        this.fileFormatPassed = fileFormatPassed;
        this.qualityScore = qualityScore;
        this.message = message;
    }
}
