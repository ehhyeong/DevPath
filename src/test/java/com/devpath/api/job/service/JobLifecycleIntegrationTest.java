package com.devpath.api.job.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.devpath.api.job.dto.CompanyRequest;
import com.devpath.api.job.dto.JobPostingRequest;
import com.devpath.domain.job.entity.JobPostingStatus;
import com.devpath.domain.job.entity.JobSource;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@DataJpaTest(
    properties = {
      "spring.jpa.hibernate.ddl-auto=create-drop",
      "spring.sql.init.mode=never",
      "spring.jpa.defer-datasource-initialization=false"
    })
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Import(JobAdminService.class)
class JobLifecycleIntegrationTest {

  @MockitoBean private JobkoreaApiClient jobkoreaApiClient;
  @Autowired private JobAdminService service;

  @Test
  void createsUpdatesClosesArchivesAndRestoresCompanyAndJob() {
    var company =
        service.createCompany(
            new CompanyRequest.Create(
                "수명주기 기업", "기업 소개", "https://company.example", null, "IT", "서울"));
    var job =
        service.createJob(
            new JobPostingRequest.Create(
                company.companyId(),
                "백엔드 개발자",
                "Backend",
                "등록 설명",
                "Java",
                "서울",
                "주니어",
                "https://jobs.example/1",
                JobSource.INTERNAL,
                JobPostingStatus.OPEN,
                LocalDate.of(2026, 12, 31),
                null));

    var closed =
        service.updateJob(
            job.jobId(),
            new JobPostingRequest.Update(
                "백엔드 개발자 수정",
                "Backend",
                "수정 설명",
                "Java, Spring",
                "서울",
                "주니어",
                "https://jobs.example/1",
                JobSource.INTERNAL,
                JobPostingStatus.CLOSED,
                LocalDate.of(2026, 12, 31),
                null));
    assertThat(closed.status()).isEqualTo(JobPostingStatus.CLOSED);

    service.archiveJob(job.jobId());
    service.archiveCompany(company.companyId());
    assertThat(service.getAllJobs()).isEmpty();
    assertThat(service.getCompanies()).isEmpty();
    assertThat(service.getAllJobs(true)).singleElement().extracting("archived").isEqualTo(true);

    service.restoreCompany(company.companyId());
    service.restoreJob(job.jobId());
    assertThat(service.getCompanies()).hasSize(1);
    assertThat(service.getAllJobs()).singleElement().extracting("title").isEqualTo("백엔드 개발자 수정");
  }
}
