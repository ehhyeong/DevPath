package com.devpath.api.course.dto;

import java.util.List;
import lombok.Builder;
import lombok.Getter;

// 강의 목록 화면과 관리자 화면에서 공통으로 사용하는 메뉴 응답 구조다.
@Getter
@Builder
public class LectureCatalogMenuResponse {

  @Builder.Default private List<CategoryItem> categories = List.of();

  @Getter
  @Builder
  public static class CategoryItem {

    private String categoryKey;
    private String label;
    private String title;
    private String iconClass;
    private Integer sortOrder;
    private Boolean active;

    @Builder.Default private List<MegaMenuItem> megaMenuItems = List.of();

    @Builder.Default private List<GroupItem> groups = List.of();
  }

  @Getter
  @Builder
  public static class MegaMenuItem {

    private String label;
    private Integer sortOrder;
  }

  @Getter
  @Builder
  public static class GroupItem {

    private String name;
    private Integer sortOrder;

    @Builder.Default private List<GroupTagItem> items = List.of();
  }

  @Getter
  @Builder
  public static class GroupTagItem {

    private String name;
    private String linkedCategoryKey;
    private Integer sortOrder;
  }
}
