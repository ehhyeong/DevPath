package com.devpath.api.job.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.api.job.dto.JobPostingRequest;
import com.devpath.api.job.dto.JobkoreaJobResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.domain.job.entity.Company;
import com.devpath.domain.job.entity.JobPosting;
import com.devpath.domain.job.entity.JobSource;
import com.devpath.domain.job.repository.CompanyRepository;
import com.devpath.domain.job.repository.JobPostingRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JobAdminServiceTest {

  @Mock private CompanyRepository companyRepository;
  @Mock private JobPostingRepository jobPostingRepository;
  @Mock private JobkoreaApiClient jobkoreaApiClient;
  @InjectMocks private JobAdminService jobAdminService;

  @Test
  void collectionPersistsNewJobAndSkipsDuplicateExternalId() {
    Company company = Company.builder().name("DevPath Labs").build();
    JobkoreaJobResponse.Posting newPosting = posting("job-1", "백엔드 개발자");
    JobkoreaJobResponse.Posting duplicatePosting = posting("job-2", "중복 공고");
    when(jobkoreaApiClient.search(any()))
        .thenReturn(
            new JobkoreaJobResponse.SearchResult(
                2,
                2,
                1,
                20,
                false,
                JobkoreaJobResponse.Attribution.jobkorea(),
                List.of(newPosting, duplicatePosting)));
    when(jobPostingRepository.existsByExternalJobIdAndIsDeletedFalse("job-1")).thenReturn(false);
    when(jobPostingRepository.existsByExternalJobIdAndIsDeletedFalse("job-2")).thenReturn(true);
    when(companyRepository.findByNameAndIsDeletedFalse("DevPath Labs"))
        .thenReturn(Optional.of(company));
    when(jobPostingRepository.save(any(JobPosting.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    var result =
        jobAdminService.collectJobs(
            new JobPostingRequest.Collect(JobSource.JOBKOREA, "Spring Boot", 20));

    assertThat(result.savedCount()).isEqualTo(1);
    assertThat(result.skippedCount()).isEqualTo(1);
    ArgumentCaptor<JobPosting> postingCaptor = ArgumentCaptor.forClass(JobPosting.class);
    verify(jobPostingRepository).save(postingCaptor.capture());
    assertThat(postingCaptor.getValue().getExternalJobId()).isEqualTo("job-1");
    assertThat(postingCaptor.getValue().getSource()).isEqualTo(JobSource.JOBKOREA);
  }

  @Test
  void companyArchiveRequiresAllLinkedJobsToBeArchived() {
    Company company = Company.builder().name("수명주기 기업").build();
    when(companyRepository.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(company));
    when(jobPostingRepository.countByCompanyIdAndIsDeletedFalse(1L)).thenReturn(1L);

    assertThatThrownBy(() -> jobAdminService.archiveCompany(1L))
        .isInstanceOf(CustomException.class);
    assertThat(company.getIsDeleted()).isFalse();
  }

  @Test
  void archivesAndRestoresJobWithoutLosingData() {
    Company company = Company.builder().name("복구 기업").build();
    JobPosting job =
        JobPosting.builder()
            .company(company)
            .title("복구 공고")
            .jobRole("Backend")
            .description("설명")
            .source(JobSource.INTERNAL)
            .status(com.devpath.domain.job.entity.JobPostingStatus.OPEN)
            .build();
    when(jobPostingRepository.findByIdAndIsDeletedFalse(2L)).thenReturn(Optional.of(job));
    when(jobPostingRepository.findById(2L)).thenReturn(Optional.of(job));

    jobAdminService.archiveJob(2L);
    assertThat(job.getIsDeleted()).isTrue();
    assertThat(job.getStatus()).isEqualTo(com.devpath.domain.job.entity.JobPostingStatus.CLOSED);

    assertThat(jobAdminService.restoreJob(2L).title()).isEqualTo("복구 공고");
    assertThat(job.getIsDeleted()).isFalse();
  }

  private JobkoreaJobResponse.Posting posting(String externalId, String title) {
    return new JobkoreaJobResponse.Posting(
        externalId,
        "DevPath Labs",
        "https://company.example",
        title,
        "BACKEND",
        "JUNIOR",
        null,
        null,
        null,
        "대학교 졸업",
        List.of("Java", "Spring Boot"),
        null,
        "정규직",
        "1명",
        null,
        "서울",
        LocalDate.now().plusDays(30),
        LocalDate.now(),
        LocalDate.now(),
        "https://jobkorea.example/job/" + externalId);
  }
}
