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
@Schema(description = "게시글 수정 요청 DTO")
public class PostUpdateRequest {

    @NotNull(message = "카테고리는 필수입니다.")
    @Schema(
            description = SwaggerDocConstants.COMMUNITY_CATEGORY_DESCRIPTION,
            example = "TECH_SHARE",
            allowableValues = {"TECH_SHARE", "CAREER", "FREE"}
    )
    private CommunityCategory category;

    @NotBlank(message = "제목을 입력해주세요.")
    @Schema(description = "수정할 게시글 제목", example = "Spring Boot N+1 문제 해결기 - 수정본")
    private String title;

    @NotBlank(message = "내용을 입력해주세요.")
    @Schema(description = "수정할 게시글 본문", example = "LAZY 로딩과 fetch join을 함께 적용했습니다.")
    private String content;
}
