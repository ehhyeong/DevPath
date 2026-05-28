package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.CourseInfoSectionItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseInfoSectionItemRepository
    extends JpaRepository<CourseInfoSectionItem, Long> {

  List<CourseInfoSectionItem>
      findAllByCourseCourseIdOrderBySectionOrderAscItemOrderAscInfoSectionItemIdAsc(Long courseId);

  void deleteAllByCourseCourseId(Long courseId);
}
