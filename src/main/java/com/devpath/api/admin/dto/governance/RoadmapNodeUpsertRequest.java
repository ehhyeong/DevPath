package com.devpath.api.admin.dto.governance;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
// 관리자에서 공식 로드맵 노드를 생성하거나 기본 정보를 수정할 때 쓰는 요청이다.
public class RoadmapNodeUpsertRequest {

  @NotNull(message = "로드맵 ID는 필수입니다.")
  private Long roadmapId;

  @NotBlank(message = "노드 제목은 필수입니다.")
  private String title;

  private String content;

  @NotBlank(message = "노드 유형은 필수입니다.")
  private String nodeType;

  @NotNull(message = "정렬 순서는 필수입니다.")
  private Integer sortOrder;

  private String subTopics;

  // 갈래 번호. 비우면 척추(기본 흐름), 값이 있으면 그 번호의 병렬 갈래다.
  // 나머지 레인 필드(branchKind·orderInLane·anchorNodeId)는 서버가 파생한다.
  private Integer laneKey;
}
