package com.devpath.config;

import com.devpath.domain.analytics.ExperimentResult;
import com.devpath.domain.analytics.ExperimentResultRepository;
import com.devpath.domain.operation.integration.ExternalIntegration;
import com.devpath.domain.operation.integration.ExternalIntegrationRepository;
import com.devpath.domain.operation.integration.IntegrationProvider;
import com.devpath.domain.operation.notice.WorkspaceNotice;
import com.devpath.domain.operation.notice.WorkspaceNoticeRepository;
import com.devpath.domain.operation.recommendation.RecommendationSetting;
import com.devpath.domain.operation.recommendation.RecommendationSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@Profile({"local", "dev"}) // 로컬 및 개발 환경에서만 실행되도록 설정
@RequiredArgsConstructor
public class DummyDataInitializer implements CommandLineRunner {

  private final WorkspaceNoticeRepository noticeRepository;
  private final ExternalIntegrationRepository integrationRepository;
  private final RecommendationSettingRepository settingRepository;
  private final ExperimentResultRepository experimentResultRepository;

  @Override
  @Transactional
  public void run(String... args) throws Exception {
    log.debug("C 파트 단독 테스트용 더미 데이터 초기화를 시작합니다.");

    initWorkspaceNotices();
    initExternalIntegrations();
    initAdminSettings();

    log.debug("더미 데이터 초기화가 완료되었습니다.");
  }

  private void initWorkspaceNotices() {
    if (noticeRepository.count() > 0) return;

    WorkspaceNotice notice1 =
        WorkspaceNotice.builder()
            .workspaceId(1L)
            .title("[필독] 워크스페이스 이용 규칙 안내")
            .content("우리 워크스페이스의 기본 이용 규칙입니다. 반드시 숙지해 주세요.")
            .build();

    WorkspaceNotice notice2 =
        WorkspaceNotice.builder()
            .workspaceId(1L)
            .title("이번 주 금요일 서버 정기 점검")
            .content("이번 주 금요일 밤 12시부터 새벽 2시까지 서버 점검이 진행됩니다.")
            .build();

    noticeRepository.save(notice1);
    noticeRepository.save(notice2);
  }

  private void initExternalIntegrations() {
    if (integrationRepository.count() > 0) return;

    ExternalIntegration github =
        ExternalIntegration.builder().workspaceId(1L).provider(IntegrationProvider.GITHUB).build();
    github.activate();

    ExternalIntegration slack =
        ExternalIntegration.builder().workspaceId(1L).provider(IntegrationProvider.SLACK).build();

    integrationRepository.save(github);
    integrationRepository.save(slack);
  }

  private void initAdminSettings() {
    if (settingRepository.count() == 0) {
      settingRepository.save(
          RecommendationSetting.builder()
              .settingKey("algorithm.weight.recent_activity")
              .settingValue("0.8")
              .description("추천 알고리즘 - 최근 활동 가중치")
              .build());

      settingRepository.save(
          RecommendationSetting.builder()
              .settingKey("algorithm.weight.tag_match")
              .settingValue("1.5")
              .description("추천 알고리즘 - 태그 일치도 가중치")
              .build());
    }

    if (experimentResultRepository.count() == 0) {
      experimentResultRepository.save(
          ExperimentResult.builder()
              .experimentId("EXP-2026-001")
              .experimentName("홈 화면 추천 UI 변경 테스트")
              .metricsJson("{\"variantA_ctr\": 0.15, \"variantB_ctr\": 0.22}")
              .build());
    }
  }
}
