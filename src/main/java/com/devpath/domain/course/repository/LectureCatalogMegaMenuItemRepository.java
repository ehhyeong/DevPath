package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.LectureCatalogMegaMenuItem;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LectureCatalogMegaMenuItemRepository
    extends JpaRepository<LectureCatalogMegaMenuItem, Long> {

  // 여러 카테고리의 메가메뉴 항목을 정렬된 상태로 한 번에 조회한다.
  List<LectureCatalogMegaMenuItem> findAllByCategoryIdInOrderByCategoryIdAscSortOrderAscIdAsc(
      Collection<Long> categoryIds);
}
