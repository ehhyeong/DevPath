package com.devpath.api.admin.dto.governance;

import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NodePrerequisitesRequest {

  private List<Long> prerequisiteNodeIds;
}
