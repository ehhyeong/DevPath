package com.devpath.api.admin.learning.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.devpath.domain.learning.entity.proof.ProofCard;
import com.devpath.domain.learning.repository.analytics.LearningMetricSampleRepository;
import com.devpath.domain.learning.repository.automation.AutomationMonitorSnapshotRepository;
import com.devpath.domain.learning.repository.proof.ProofCardRepository;
import com.devpath.domain.learning.service.LearningAutomationPolicyService;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;

@DataJpaTest(
    properties = {
      "spring.jpa.hibernate.ddl-auto=create-drop",
      "spring.sql.init.mode=never",
      "spring.jpa.defer-datasource-initialization=false"
    })
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Import({AdminLearningMetricService.class, LearningAutomationPolicyService.class})
class AnnualLearningReportIntegrationTest {

  @Autowired private AdminLearningMetricService service;
  @Autowired private UserRepository userRepository;
  @Autowired private ProofCardRepository proofCardRepository;
  @Autowired private LearningMetricSampleRepository metricSampleRepository;
  @Autowired private AutomationMonitorSnapshotRepository monitorSnapshotRepository;

  @Test
  void repeatedQueriesAreReadOnlyAndUseExclusiveNextYearBoundary() {
    User user =
        userRepository.save(
            User.builder()
                .email("annual-report@devpath.com")
                .password("encoded")
                .name("연간 리포트")
                .build());
    proofCardRepository.save(
        ProofCard.builder()
            .user(user)
            .title("2025 마지막 카드")
            .issuedAt(LocalDateTime.of(2025, 12, 31, 23, 59, 59))
            .build());
    proofCardRepository.save(
        ProofCard.builder()
            .user(user)
            .title("2026 첫 카드")
            .issuedAt(LocalDateTime.of(2026, 1, 1, 0, 0))
            .build());

    long metricCount = metricSampleRepository.count();
    long monitorCount = monitorSnapshotRepository.count();
    assertThat(service.getAnnualReport(2025).getIssuedProofCardCount()).isEqualTo(1);
    assertThat(service.getAnnualReport(2025).getIssuedProofCardCount()).isEqualTo(1);
    assertThat(service.getAnnualReport(2026).getIssuedProofCardCount()).isEqualTo(1);
    assertThat(metricSampleRepository.count()).isEqualTo(metricCount);
    assertThat(monitorSnapshotRepository.count()).isEqualTo(monitorCount);
  }
}
