package com.devpath.domain.job.repository;

import com.devpath.domain.job.entity.JobSkillTag;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface JobSkillTagRepository extends JpaRepository<JobSkillTag, Long> {

  @EntityGraph(attributePaths = "jobPosting")
  List<JobSkillTag> findAllByJobPosting_IdAndIsDeletedFalseOrderByNameAsc(Long jobId);

  List<JobSkillTag> findAllByJobPosting_IdAndIsDeletedFalse(Long jobId);

  @EntityGraph(attributePaths = "jobPosting")
  List<JobSkillTag> findAllByJobPosting_IdInAndIsDeletedFalse(List<Long> jobIds);

  @Query(
      """
      select tag.name as tagName, count(tag.id) as usageCount
      from JobSkillTag tag
      where tag.isDeleted = false
      group by tag.name
      order by count(tag.id) desc, tag.name asc
      """)
  List<PopularSkillTagProjection> findPopularSkillTags();

  long countByIsDeletedFalse();

  interface PopularSkillTagProjection {

    String getTagName();

    Long getUsageCount();
  }
}
