package com.devpath.api.instructor.dto.review;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "리뷰 이슈 태그 요청")
public class ReviewIssueTagRequest {

  @NotEmpty
  @Schema(description = "리뷰 이슈 태그 목록", example = "[\"slow-audio\", \"too-fast\"]")
  private List<String> issueTags;
}
