package com.devpath.domain.community.entity;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "커뮤니티 게시판 카테고리")
public enum CommunityCategory {

    @Schema(description = "기술 공유 게시판")
    TECH_SHARE,

    @Schema(description = "커리어·이직 게시판")
    CAREER,

    @Schema(description = "자유 게시판")
    FREE
}
