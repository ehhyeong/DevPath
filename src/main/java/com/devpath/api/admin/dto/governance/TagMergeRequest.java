package com.devpath.api.admin.dto.governance;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TagMergeRequest {

  @NotEmpty private List<Long> sourceTagIds;

  @NotNull private Long targetTagId;
}
