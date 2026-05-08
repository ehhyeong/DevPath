package com.devpath.api.project.dto;

import com.devpath.domain.project.entity.ProjectRecruitingStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UpdateRecruitingStatusRequest {

  @NotNull(message = "모집 상태는 필수입니다.")
  private ProjectRecruitingStatus recruitingStatus;
}
