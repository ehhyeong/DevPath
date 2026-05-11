package com.devpath.api.squad.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SquadLoungePostRequest {

  @NotBlank(message = "스쿼드 제목은 필수입니다.")
  @Size(max = 100, message = "스쿼드 제목은 100자 이하여야 합니다.")
  private String title;

  @NotBlank(message = "스쿼드 유형은 필수입니다.")
  private String type;

  private LocalDate deadline;

  @Min(value = 1, message = "모집 인원은 1명 이상이어야 합니다.")
  private Integer maxMembers;

  private List<String> tags;

  @NotBlank(message = "소개글은 필수입니다.")
  @Size(max = 3000, message = "소개글은 3000자 이하여야 합니다.")
  private String description;

  private List<String> roles;
}
