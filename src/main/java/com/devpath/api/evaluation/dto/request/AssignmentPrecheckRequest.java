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
@Schema(description = "과제 precheck 요청 DTO")
public class AssignmentPrecheckRequest {

    // 텍스트형 제출 내용을 미리 검증할 때 사용할 본문이다.
    @Schema(description = "제출 텍스트", example = "과제 설명에 맞춰 구현 내용을 정리했습니다.")
    private String submissionText;

    // URL형 제출 내용을 미리 검증할 때 사용할 링크다.
    @Schema(description = "제출 URL", example = "https://github.com/example/devpath-assignment")
    private String submissionUrl;

    // README 포함 여부를 프론트나 클라이언트에서 전달받아 precheck에 사용한다.
    @Schema(description = "README 포함 여부", example = "true")
    private Boolean hasReadme;

    // 테스트 통과 여부를 precheck 입력값으로 받는다.
    @Schema(description = "테스트 통과 여부", example = "true")
    private Boolean testPassed;

    // 린트 통과 여부를 precheck 입력값으로 받는다.
    @Schema(description = "린트 통과 여부", example = "true")
    private Boolean lintPassed;

    // 제출 예정 파일 목록이며 허용 파일 형식 검증에 사용한다.
    @Valid
    @Schema(description = "제출 파일 목록")
    private List<CreateSubmissionFileRequest> files = new ArrayList<>();

    @Builder
    public AssignmentPrecheckRequest(
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
