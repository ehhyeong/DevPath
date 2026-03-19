package com.devpath.api.admin.dto;

import com.devpath.domain.user.entity.Tag;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "태그 응답 DTO")
public class TagResponse {

    private Long tagId;
    private String name;
    private String category;

    @Builder
    public TagResponse(Long tagId, String name, String category) {
        this.tagId = tagId;
        this.name = name;
        this.category = category;
    }

    public static TagResponse from(Tag tag) {
        return TagResponse.builder()
                .tagId(tag.getTagId())
                .name(tag.getName())
                .category(tag.getCategory())
                .build();
    }
}