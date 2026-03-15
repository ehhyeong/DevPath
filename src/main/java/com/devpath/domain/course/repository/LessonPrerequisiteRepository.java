package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.LessonPrerequisite;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

// Repository for reading and cleaning prerequisite links around lesson mutations.
public interface LessonPrerequisiteRepository extends JpaRepository<LessonPrerequisite, Long> {

  // Preserves insertion order when returning stored prerequisite links.
  List<LessonPrerequisite> findAllByLessonLessonIdOrderByLessonPrerequisiteIdAsc(Long lessonId);

  // Replaces the entire prerequisite set for a single lesson.
  void deleteAllByLessonLessonId(Long lessonId);

  // Clears links where the lesson appears either as the owner or as a prerequisite.
  void deleteAllByLessonLessonIdOrPrerequisiteLessonLessonId(
      Long lessonId, Long prerequisiteLessonId);

  // Bulk cleanup used before section or course level lesson deletion.
  void deleteAllByLessonLessonIdInOrPrerequisiteLessonLessonIdIn(
      Collection<Long> lessonIds, Collection<Long> prerequisiteLessonIds);
}
