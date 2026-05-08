package com.devpath.api.admin.dto.governance;

import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CourseNodeMappingCandidateResponse {

  private Long courseId;
  private String courseTitle;
  private List<Long> suggestedNodeIds;
  private Double tagMatchRate;
}
