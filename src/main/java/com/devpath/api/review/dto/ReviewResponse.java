package com.devpath.api.review.dto;

import com.devpath.api.review.entity.Review;
import com.devpath.api.review.entity.ReviewStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "리뷰 응답")
public class ReviewResponse {

    @Schema(description = "리뷰 ID", example = "21")
    private Long id;

    @Schema(description = "강의 ID", example = "101")
    private Long courseId;

    @Schema(description = "작성 학습자 ID", example = "7")
    private Long learnerId;

    @Schema(description = "별점", example = "5")
    private Integer rating;

    @Schema(description = "리뷰 내용", example = "예제가 많아서 이해하기 쉬웠습니다.")
    private String content;

    @Schema(description = "리뷰 상태", example = "UNANSWERED")
    private ReviewStatus status;

    @Schema(description = "숨김 여부", example = "false")
    private Boolean isHidden;

    @Schema(description = "이슈 태그 목록", example = "[\"slow-audio\", \"too-fast\"]")
    private List<String> issueTags;

    @Schema(description = "작성 시각")
    private LocalDateTime createdAt;

    @Schema(description = "수정 시각")
    private LocalDateTime updatedAt;

    public static ReviewResponse from(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .courseId(review.getCourseId())
                .learnerId(review.getLearnerId())
                .rating(review.getRating())
                .content(review.getContent())
                .status(review.getStatus())
                .isHidden(review.getIsHidden())
                .issueTags(parseIssueTags(review.getIssueTagsRaw()))
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }

    private static List<String> parseIssueTags(String issueTagsRaw) {
        if (issueTagsRaw == null || issueTagsRaw.isBlank()) {
            return List.of();
        }

        return Arrays.stream(issueTagsRaw.split(","))
                .map(String::trim)
                .filter(tag -> !tag.isBlank())
                .distinct()
                .collect(Collectors.toList());
    }
}
