package com.devpath.api.study.dto;

import com.devpath.domain.study.entity.StudyGroupStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "스터디 그룹 모집 상태 변경 요청 DTO")
public class StudyGroupStatusRequest {

    @NotNull(message = "변경할 상태값은 필수입니다.")
    @Schema(description = "변경할 상태", example = "IN_PROGRESS")
    private StudyGroupStatus status;
}