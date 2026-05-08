package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.LectureCatalogCategory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LectureCatalogCategoryRepository
    extends JpaRepository<LectureCatalogCategory, Long> {

  // 공개 화면과 관리자 화면 모두 같은 순서로 카테고리를 불러온다.
  List<LectureCatalogCategory> findAllByOrderBySortOrderAscIdAsc();
}
