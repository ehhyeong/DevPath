package com.devpath.api.job.service;

import com.devpath.api.job.dto.CompanyRequest;
import com.devpath.api.job.dto.CompanyResponse;
import com.devpath.api.job.dto.JobPostingRequest;
import com.devpath.api.job.dto.JobPostingResponse;
import com.devpath.api.job.dto.JobkoreaJobRequest;
import com.devpath.api.job.dto.JobkoreaJobResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.job.entity.Company;
import com.devpath.domain.job.entity.JobPosting;
import com.devpath.domain.job.entity.JobPostingStatus;
import com.devpath.domain.job.entity.JobSource;
import com.devpath.domain.job.repository.CompanyRepository;
import com.devpath.domain.job.repository.JobPostingRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JobAdminService {

  private final CompanyRepository companyRepository;
  private final JobPostingRepository jobPostingRepository;
  private final JobkoreaApiClient jobkoreaApiClient;

  @Transactional
  public CompanyResponse.Detail createCompany(CompanyRequest.Create request) {
    validateCompanyNameNotDuplicated(request.name());

    Company company =
        Company.builder()
            .name(request.name())
            .description(request.description())
            .websiteUrl(request.websiteUrl())
            .logoUrl(request.logoUrl())
            .industry(request.industry())
            .location(request.location())
            .build();

    return CompanyResponse.Detail.from(companyRepository.save(company));
  }

  public List<CompanyResponse.Summary> getCompanies() {
    return getCompanies(false);
  }

  public List<CompanyResponse.Summary> getCompanies(boolean includeArchived) {
    List<Company> companies =
        includeArchived
            ? companyRepository.findAllByOrderByCreatedAtDesc()
            : companyRepository.findAllByIsDeletedFalseOrderByCreatedAtDesc();
    return companies.stream().map(CompanyResponse.Summary::from).toList();
  }

  public CompanyResponse.Detail getCompany(Long companyId) {
    return CompanyResponse.Detail.from(getActiveCompany(companyId));
  }

  @Transactional
  public CompanyResponse.Detail updateCompany(Long companyId, CompanyRequest.Update request) {
    Company company = getActiveCompany(companyId);

    if (!company.getName().equals(request.name())) {
      validateCompanyNameNotDuplicated(request.name());
    }

    company.updateProfile(
        request.name(),
        request.description(),
        request.websiteUrl(),
        request.logoUrl(),
        request.industry(),
        request.location());

    return CompanyResponse.Detail.from(company);
  }

  @Transactional
  public CompanyResponse.Detail verifyCompany(Long companyId, CompanyRequest.Verify request) {
    Company company = getActiveCompany(companyId);

    company.changeVerificationStatus(request.status(), request.memo());

    return CompanyResponse.Detail.from(company);
  }

  @Transactional
  public JobPostingResponse.Detail createJob(JobPostingRequest.Create request) {
    Company company = getActiveCompany(request.companyId());

    validateExternalJobIdNotDuplicated(request.externalJobId());

    JobPosting jobPosting =
        JobPosting.builder()
            .company(company)
            .title(request.title())
            .jobRole(request.jobRole())
            .description(request.description())
            .requiredSkills(request.requiredSkills())
            .region(request.region())
            .careerLevel(request.careerLevel())
            .sourceUrl(request.sourceUrl())
            .source(request.source())
            .status(request.status())
            .deadline(request.deadline())
            .externalJobId(request.externalJobId())
            .build();

    return JobPostingResponse.Detail.from(jobPostingRepository.save(jobPosting));
  }

  public List<JobPostingResponse.Summary> getOpenJobs() {
    return jobPostingRepository
        .findAllByStatusAndIsDeletedFalseOrderByCreatedAtDesc(JobPostingStatus.OPEN)
        .stream()
        .map(JobPostingResponse.Summary::from)
        .toList();
  }

  public List<JobPostingResponse.Summary> getAllJobs() {
    return getAllJobs(false);
  }

  public List<JobPostingResponse.Summary> getAllJobs(boolean includeArchived) {
    List<JobPosting> jobs =
        includeArchived
            ? jobPostingRepository.findAllByOrderByCreatedAtDesc()
            : jobPostingRepository.findAllByIsDeletedFalseOrderByCreatedAtDesc();
    return jobs.stream().map(JobPostingResponse.Summary::from).toList();
  }

  public JobPostingResponse.Detail getJob(Long jobId) {
    JobPosting job =
        jobPostingRepository
            .findByIdAndIsDeletedFalseAndStatusAndCompanyIsDeletedFalse(
                jobId, JobPostingStatus.OPEN)
            .orElseThrow(() -> new CustomException(ErrorCode.JOB_POSTING_NOT_FOUND));
    return JobPostingResponse.Detail.from(job);
  }

  public JobPostingResponse.Detail getAdminJob(Long jobId) {
    return JobPostingResponse.Detail.from(getJobIncludingArchived(jobId));
  }

  @Transactional
  public JobPostingResponse.Detail updateJob(Long jobId, JobPostingRequest.Update request) {
    JobPosting jobPosting = getActiveJob(jobId);

    if (isExternalJobIdChanged(jobPosting.getExternalJobId(), request.externalJobId())) {
      validateExternalJobIdNotDuplicated(request.externalJobId());
    }

    jobPosting.update(
        request.title(),
        request.jobRole(),
        request.description(),
        request.requiredSkills(),
        request.region(),
        request.careerLevel(),
        request.sourceUrl(),
        request.source(),
        request.status(),
        request.deadline(),
        request.externalJobId());

    return JobPostingResponse.Detail.from(jobPosting);
  }

  @Transactional
  public void archiveJob(Long jobId) {
    getActiveJob(jobId).delete();
  }

  @Transactional
  public JobPostingResponse.Detail restoreJob(Long jobId) {
    JobPosting job = getJobIncludingArchived(jobId);
    if (!Boolean.TRUE.equals(job.getIsDeleted())) {
      return JobPostingResponse.Detail.from(job);
    }
    if (Boolean.TRUE.equals(job.getCompany().getIsDeleted())) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "보관된 기업을 먼저 복구해야 합니다.");
    }
    validateExternalJobIdNotDuplicated(job.getExternalJobId());
    job.restore();
    return JobPostingResponse.Detail.from(job);
  }

  @Transactional
  public void archiveCompany(Long companyId) {
    Company company = getActiveCompany(companyId);
    if (jobPostingRepository.countByCompanyIdAndIsDeletedFalse(companyId) > 0) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "연결된 채용 공고를 먼저 보관해야 합니다.");
    }
    company.delete();
  }

  @Transactional
  public CompanyResponse.Detail restoreCompany(Long companyId) {
    Company company = getCompanyIncludingArchived(companyId);
    if (!Boolean.TRUE.equals(company.getIsDeleted())) {
      return CompanyResponse.Detail.from(company);
    }
    validateCompanyNameNotDuplicated(company.getName());
    company.restore();
    return CompanyResponse.Detail.from(company);
  }

  @Transactional
  public JobPostingResponse.CollectResult collectJobs(JobPostingRequest.Collect request) {
    if (request.source() != JobSource.JOBKOREA) {
      throw new CustomException(ErrorCode.JOB_COLLECT_FAILED, "현재 실제 수집을 지원하는 외부 소스는 JOBKOREA입니다.");
    }

    JobkoreaJobResponse.SearchResult result =
        jobkoreaApiClient.search(
            new JobkoreaJobRequest.Search(
                request.limit(), 1, 1, request.keyword(), null, null, null, false));
    int savedCount = 0;
    int skippedCount = 0;
    for (JobkoreaJobResponse.Posting posting : result.items()) {
      if (posting.externalId() == null
          || jobPostingRepository.existsByExternalJobIdAndIsDeletedFalse(posting.externalId())) {
        skippedCount += 1;
        continue;
      }

      Company company = findOrCreateCollectedCompany(posting);
      jobPostingRepository.save(toCollectedJob(company, posting));
      savedCount += 1;
    }
    return JobPostingResponse.CollectResult.completed(
        request.source(), request.keyword(), request.limit(), savedCount, skippedCount);
  }

  private Company findOrCreateCollectedCompany(JobkoreaJobResponse.Posting posting) {
    String companyName =
        posting.companyName() == null || posting.companyName().isBlank()
            ? "잡코리아 미상 기업"
            : posting.companyName();
    return companyRepository
        .findByNameAndIsDeletedFalse(companyName)
        .orElseGet(
            () ->
                companyRepository.save(
                    Company.builder()
                        .name(companyName)
                        .websiteUrl(posting.companyUrl())
                        .description("잡코리아 외부 수집으로 등록된 기업입니다.")
                        .build()));
  }

  private JobPosting toCollectedJob(Company company, JobkoreaJobResponse.Posting posting) {
    String keywords = String.join(", ", posting.keywords());
    return JobPosting.builder()
        .company(company)
        .title(posting.title() == null ? "제목 미상 채용 공고" : posting.title())
        .jobRole(posting.jobCategoryCode() == null ? "기타" : posting.jobCategoryCode())
        .description(buildCollectedDescription(posting))
        .requiredSkills(keywords)
        .region(posting.areaCode())
        .careerLevel(posting.careerCode())
        .sourceUrl(posting.jobkoreaUrl())
        .source(JobSource.JOBKOREA)
        .status(
            posting.deadline() != null && posting.deadline().isBefore(java.time.LocalDate.now())
                ? JobPostingStatus.CLOSED
                : JobPostingStatus.OPEN)
        .deadline(posting.deadline())
        .externalJobId(posting.externalId())
        .build();
  }

  private String buildCollectedDescription(JobkoreaJobResponse.Posting posting) {
    return "잡코리아 수집 공고입니다. 근무형태: %s, 학력조건: %s, 모집인원: %s"
        .formatted(
            valueOrDash(posting.jobType()),
            valueOrDash(posting.educationCode()),
            valueOrDash(posting.staff()));
  }

  private String valueOrDash(String value) {
    return value == null || value.isBlank() ? "-" : value;
  }

  private Company getActiveCompany(Long companyId) {
    return companyRepository
        .findByIdAndIsDeletedFalse(companyId)
        .orElseThrow(() -> new CustomException(ErrorCode.JOB_COMPANY_NOT_FOUND));
  }

  private JobPosting getActiveJob(Long jobId) {
    return jobPostingRepository
        .findByIdAndIsDeletedFalse(jobId)
        .orElseThrow(() -> new CustomException(ErrorCode.JOB_POSTING_NOT_FOUND));
  }

  private JobPosting getJobIncludingArchived(Long jobId) {
    return jobPostingRepository
        .findById(jobId)
        .orElseThrow(() -> new CustomException(ErrorCode.JOB_POSTING_NOT_FOUND));
  }

  private Company getCompanyIncludingArchived(Long companyId) {
    return companyRepository
        .findById(companyId)
        .orElseThrow(() -> new CustomException(ErrorCode.JOB_COMPANY_NOT_FOUND));
  }

  private void validateCompanyNameNotDuplicated(String name) {
    if (companyRepository.existsByNameAndIsDeletedFalse(name)) {
      throw new CustomException(ErrorCode.JOB_COMPANY_ALREADY_EXISTS);
    }
  }

  private void validateExternalJobIdNotDuplicated(String externalJobId) {
    if (externalJobId == null || externalJobId.trim().isEmpty()) {
      return;
    }

    if (jobPostingRepository.existsByExternalJobIdAndIsDeletedFalse(externalJobId)) {
      throw new CustomException(ErrorCode.JOB_POSTING_ALREADY_EXISTS);
    }
  }

  private boolean isExternalJobIdChanged(
      String currentExternalJobId, String requestedExternalJobId) {
    if (currentExternalJobId == null) {
      return requestedExternalJobId != null;
    }

    return !currentExternalJobId.equals(requestedExternalJobId);
  }
}
