package com.devpath.api.admin.dto.governance;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NodeRequiredTagsRequest {

  @NotEmpty private List<String> requiredTags;
}
