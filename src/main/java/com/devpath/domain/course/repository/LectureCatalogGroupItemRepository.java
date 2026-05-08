package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.LectureCatalogGroupItem;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LectureCatalogGroupItemRepository
    extends JpaRepository<LectureCatalogGroupItem, Long> {

  // 그룹별 필터 항목을 정렬된 상태로 한 번에 조회한다.
  List<LectureCatalogGroupItem> findAllByGroupIdInOrderByGroupIdAscSortOrderAscIdAsc(
      Collection<Long> groupIds);
}
