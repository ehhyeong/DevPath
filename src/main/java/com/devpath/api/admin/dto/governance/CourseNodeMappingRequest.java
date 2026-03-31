package com.devpath.api.admin.dto.governance;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "강의-노드 매핑 반영 요청")
public class CourseNodeMappingRequest {

    // 빈 배열은 허용해서 기존 매핑 전체 해제에도 사용할 수 있게 한다.
    @NotNull
    @Schema(description = "매핑할 노드 ID 목록", example = "[11, 12, 13]")
    private List<Long> nodeIds;
}
