package com.devpath.api.community.dto;

import com.devpath.common.swagger.SwaggerDocConstants;
import com.devpath.domain.community.entity.CommunityCategory;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "게시글 작성/수정 요청 DTO")
public class PostRequest {

    @NotNull(message = "카테고리는 필수입니다.")
    @Schema(
            description = SwaggerDocConstants.COMMUNITY_CATEGORY_DESCRIPTION,
            example = "TECH_SHARE",
            allowableValues = {"TECH_SHARE", "CAREER", "FREE"}
    )
    private CommunityCategory category;

    @NotBlank(message = "제목을 입력해주세요.")
    @Schema(description = "게시글 제목", example = "Spring Boot N+1 문제 해결기")
    private String title;

    @NotBlank(message = "내용을 입력해주세요.")
    @Schema(description = "게시글 본문", example = "FetchType.LAZY를 적용하여...")
    private String content;
}
