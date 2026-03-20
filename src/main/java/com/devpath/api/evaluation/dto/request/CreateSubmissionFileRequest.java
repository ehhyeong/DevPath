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
@Schema(description = "과제 제출 파일 정보 요청 DTO")
public class CreateSubmissionFileRequest {

    // 업로드한 파일의 이름이다.
    @NotBlank
    @Schema(description = "파일명", example = "README.md")
    private String fileName;

    // 파일 저장소에 접근 가능한 URL이다.
    @NotBlank
    @Schema(description = "파일 URL", example = "https://s3.example.com/devpath/README.md")
    private String fileUrl;

    // 파일 크기를 byte 단위로 전달한다.
    @PositiveOrZero
    @Schema(description = "파일 크기(byte)", example = "2048")
    private Long fileSize;

    // MIME 타입 또는 확장자 기반 파일 타입 정보다.
    @Schema(description = "파일 타입", example = "md")
    private String fileType;

    @Builder
    public CreateSubmissionFileRequest(String fileName, String fileUrl, Long fileSize, String fileType) {
        this.fileName = fileName;
        this.fileUrl = fileUrl;
        this.fileSize = fileSize;
        this.fileType = fileType;
    }
}
