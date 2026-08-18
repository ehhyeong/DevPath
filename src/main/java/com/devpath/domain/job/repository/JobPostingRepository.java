package com.devpath.domain.job.repository;

import com.devpath.domain.job.entity.JobPosting;
import com.devpath.domain.job.entity.JobPostingStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface JobPostingRepository extends JpaRepository<JobPosting, Long> {

  boolean existsByExternalJobIdAndIsDeletedFalse(String externalJobId);

  @EntityGraph(attributePaths = "company")
  List<JobPosting> findAllByStatusAndIsDeletedFalseOrderByCreatedAtDesc(JobPostingStatus status);

  @EntityGraph(attributePaths = "company")
  List<JobPosting> findAllByIsDeletedFalseOrderByCreatedAtDesc();

  @EntityGraph(attributePaths = "company")
  List<JobPosting> findAllByOrderByCreatedAtDesc();

  @EntityGraph(attributePaths = "company")
  Optional<JobPosting> findByIdAndIsDeletedFalse(Long id);

  long countByStatusAndIsDeletedFalse(JobPostingStatus status);

  long countByIsDeletedFalse();

  long countByCompanyIdAndIsDeletedFalse(Long companyId);

  @EntityGraph(attributePaths = "company")
  Optional<JobPosting> findByIdAndIsDeletedFalseAndStatusAndCompanyIsDeletedFalse(
      Long id, JobPostingStatus status);

  @Query(
      """
      select posting.jobRole as jobRole, count(posting.id) as postingCount
      from JobPosting posting
      where posting.isDeleted = false
      group by posting.jobRole
      order by count(posting.id) desc, posting.jobRole asc
      """)
  List<JobRoleTrendProjection> findJobRoleTrends();

  @Query(
      """
      select coalesce(posting.region, 'UNKNOWN') as label, count(posting.id) as postingCount
      from JobPosting posting
      where posting.isDeleted = false
      group by coalesce(posting.region, 'UNKNOWN')
      order by count(posting.id) desc, coalesce(posting.region, 'UNKNOWN') asc
      """)
  List<MarketIndicatorProjection> findRegionIndicators();

  @Query(
      """
      select coalesce(posting.careerLevel, 'UNKNOWN') as label, count(posting.id) as postingCount
      from JobPosting posting
      where posting.isDeleted = false
      group by coalesce(posting.careerLevel, 'UNKNOWN')
      order by count(posting.id) desc, coalesce(posting.careerLevel, 'UNKNOWN') asc
      """)
  List<MarketIndicatorProjection> findCareerLevelIndicators();

  interface JobRoleTrendProjection {

    String getJobRole();

    Long getPostingCount();
  }

  interface MarketIndicatorProjection {

    String getLabel();

    Long getPostingCount();
  }
}
