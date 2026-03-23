package com.devpath.api.community.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "게시글 페이지 응답 DTO")
public class PostPageResponse {

    @Schema(description = "게시글 목록")
    private List<PostResponse> content;

    @Schema(description = "현재 페이지 번호", example = "0")
    private int page;

    @Schema(description = "페이지 크기", example = "10")
    private int size;

    @Schema(description = "전체 게시글 수", example = "57")
    private long totalElements;

    @Schema(description = "전체 페이지 수", example = "6")
    private int totalPages;

    @Schema(description = "다음 페이지 존재 여부", example = "true")
    private boolean hasNext;

    // 페이지 응답 메타데이터와 게시글 목록을 함께 묶어 반환한다.
    public static PostPageResponse of(
            List<PostResponse> content,
            int page,
            int size,
            long totalElements,
            int totalPages,
            boolean hasNext
    ) {
        return PostPageResponse.builder()
                .content(content)
                .page(page)
                .size(size)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .hasNext(hasNext)
                .build();
    }
}
