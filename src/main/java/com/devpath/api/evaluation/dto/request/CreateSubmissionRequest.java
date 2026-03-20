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
@Schema(description = "과제 제출 생성 요청 DTO")
public class CreateSubmissionRequest {

    // 텍스트형 제출 본문이다.
    @Schema(description = "제출 텍스트", example = "구현 요약 및 실행 결과를 첨부했습니다.")
    private String submissionText;

    // URL형 제출 링크다.
    @Schema(description = "제출 URL", example = "https://github.com/example/devpath-assignment")
    private String submissionUrl;

    // README 포함 여부이며 실제 제출 시 precheck 결과 계산에 사용한다.
    @Schema(description = "README 포함 여부", example = "true")
    private Boolean hasReadme;

    // 테스트 통과 여부이며 실제 제출 시 precheck 결과 계산에 사용한다.
    @Schema(description = "테스트 통과 여부", example = "true")
    private Boolean testPassed;

    // 린트 통과 여부이며 실제 제출 시 precheck 결과 계산에 사용한다.
    @Schema(description = "린트 통과 여부", example = "true")
    private Boolean lintPassed;

    // 제출 파일 목록이다.
    @Valid
    @Schema(description = "제출 파일 목록")
    private List<CreateSubmissionFileRequest> files = new ArrayList<>();

    @Builder
    public CreateSubmissionRequest(
            String submissionText,
            String submissionUrl,
            Boolean hasReadme,
            Boolean testPassed,
            Boolean lintPassed,
            List<CreateSubmissionFileRequest> files
    ) {
        this.submissionText = submissionText;
        this.submissionUrl = submissionUrl;
        this.hasReadme = hasReadme;
        this.testPassed = testPassed;
        this.lintPassed = lintPassed;
        this.files = files == null ? new ArrayList<>() : files;
    }
}
