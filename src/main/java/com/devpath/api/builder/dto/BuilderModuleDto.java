package com.devpath.api.builder.dto;

import com.devpath.domain.builder.entity.BuilderModule;
import java.util.List;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class BuilderModuleDto {

  private Long id;
  private String moduleId;
  private String category;
  private String title;
  private String icon;
  private String color;
  private String bgColor;
  private List<String> topics;
  private int sortOrder;

  public static BuilderModuleDto from(BuilderModule module) {
    return BuilderModuleDto.builder()
        .id(module.getId())
        .moduleId(module.getModuleId())
        .category(module.getCategory())
        .title(module.getTitle())
        .icon(module.getIcon())
        .color(module.getColor())
        .bgColor(module.getBgColor())
        .topics(module.getTopics())
        .sortOrder(module.getSortOrder())
        .build();
  }
}
