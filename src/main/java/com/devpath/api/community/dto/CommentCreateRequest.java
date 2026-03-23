package com.devpath.api.community.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "댓글/대댓글 작성 요청 DTO")
public class CommentCreateRequest {

    @NotBlank(message = "댓글 내용을 입력해주세요.")
    @Schema(
            description = "댓글 또는 대댓글 본문입니다.",
            example = "이 방식이면 fetch join 없이도 해결 가능합니다."
    )
    private String content;
}
