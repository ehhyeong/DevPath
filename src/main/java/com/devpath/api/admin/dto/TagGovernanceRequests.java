package com.devpath.api.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class TagGovernanceRequests {

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(description = "공식 태그 생성 요청 DTO")
  public static class CreateTag {

    @Schema(description = "태그명", example = "spring-boot")
    private String name;

    @Schema(description = "카테고리", example = "backend")
    private String category;
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(description = "공식 태그 수정 요청 DTO")
  public static class UpdateTag {

    @Schema(description = "변경할 태그명", example = "spring-security")
    private String name;

    @Schema(description = "변경할 카테고리", example = "backend")
    private String category;
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(description = "태그 병합 요청 DTO")
  public static class MergeTags {

    @Schema(description = "병합 후 삭제할 태그 ID", example = "11")
    private Long sourceTagId;

    @Schema(description = "남길 태그 ID", example = "12")
    private Long targetTagId;
  }
}
