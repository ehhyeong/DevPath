package com.devpath.api.admin.dto.governance;

import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TagGuideResponse {

  private List<TagResponse> standardTags;
  private String guideMessage;
}
