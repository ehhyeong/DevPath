package com.devpath.api.admin.dto.catalog;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import lombok.Getter;

// 관리자 메뉴 저장 요청 전체 구조를 받는다.
@Getter
public class LectureCatalogMenuUpdateRequest {

  @Valid @NotEmpty private List<CategoryRequest> categories;

  @Getter
  public static class CategoryRequest {

    private String categoryKey;
    private String label;
    private String title;
    private String iconClass;
    private Integer sortOrder;
    private Boolean active;

    @Valid private List<MegaMenuItemRequest> megaMenuItems;

    @Valid private List<GroupRequest> groups;
  }

  @Getter
  public static class MegaMenuItemRequest {

    private String label;
    private Integer sortOrder;
  }

  @Getter
  public static class GroupRequest {

    private String name;
    private Integer sortOrder;

    @Valid private List<GroupItemRequest> items;
  }

  @Getter
  public static class GroupItemRequest {

    private String name;
    private String linkedCategoryKey;
    private Integer sortOrder;
  }
}
