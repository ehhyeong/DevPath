package com.devpath.api.admin.dto.governance;

import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
// 관리자 로드맵 표에 표시하는 노드 요약 정보다.
public class AdminRoadmapNodeSummaryResponse {

  private Long nodeId;
  private Long roadmapId;
  private String roadmapTitle;
  private String title;
  private String content;
  private String nodeType;
  private Integer sortOrder;
  private String subTopics;
  private Integer laneKey;
  private List<Long> prerequisiteNodeIds;
  private boolean required;
  private int requiredTagCount;
  private List<String> requiredTags;
  private String completionRuleDescription;
  private Integer requiredProgressRate;
}
