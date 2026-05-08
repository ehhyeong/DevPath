package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.LectureCatalogGroup;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LectureCatalogGroupRepository extends JpaRepository<LectureCatalogGroup, Long> {

  // 카테고리별 필터 그룹을 정렬된 상태로 한 번에 조회한다.
  List<LectureCatalogGroup> findAllByCategoryIdInOrderByCategoryIdAscSortOrderAscIdAsc(
      Collection<Long> categoryIds);
}
