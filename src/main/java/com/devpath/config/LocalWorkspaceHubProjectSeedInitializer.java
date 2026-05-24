package com.devpath.config;

import com.devpath.domain.workspace.entity.WorkspaceHubProject;
import com.devpath.domain.workspace.repository.WorkspaceHubProjectRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile({"local", "dev"})
@Order(Ordered.HIGHEST_PRECEDENCE + 5)
@RequiredArgsConstructor
public class LocalWorkspaceHubProjectSeedInitializer implements CommandLineRunner {

  private final WorkspaceHubProjectRepository workspaceHubProjectRepository;

  @Override
  @Transactional
  public void run(String... args) {
    workspaceHubSeeds().forEach(this::ensureProject);
  }

  private void ensureProject(ProjectSeed seed) {
    if (workspaceHubProjectRepository.findByDomIdAndIsDeletedFalse(seed.domId()).isPresent()) {
      return;
    }

    workspaceHubProjectRepository.save(
        WorkspaceHubProject.builder()
            .domId(seed.domId())
            .menuId(seed.menuId())
            .type(seed.type())
            .status(seed.status())
            .dashboardUrl(seed.dashboardUrl())
            .title(seed.title())
            .description(seed.description())
            .progressPercent(seed.progressPercent())
            .mentoringModeLabel(seed.mentoringModeLabel())
            .mentoringModeIcon(seed.mentoringModeIcon())
            .categoryLabel(seed.categoryLabel())
            .roleLabel(seed.roleLabel())
            .footerKind(seed.footerKind())
            .footerDateLabel(seed.footerDateLabel())
            .memberAvatarSeeds(seed.memberAvatarSeeds())
            .extraMemberCount(seed.extraMemberCount())
            .footerAvatarSeed(seed.footerAvatarSeed())
            .footerText(seed.footerText())
            .footerMetaText(seed.footerMetaText())
            .footerMetaIcon(seed.footerMetaIcon())
            .sortOrder(seed.sortOrder())
            .build());
  }

  private List<ProjectSeed> workspaceHubSeeds() {
    return List.of(
        new ProjectSeed(
            "proj-squad-1",
            "menu-1",
            "squad",
            "progress",
            "/workspace-hub",
            "배달비 절약 플랫폼",
            "위치 기반 실시간 공동 구매 매칭 서비스 MVP 개발",
            40,
            null,
            null,
            null,
            null,
            "avatars",
            "어제",
            "A,B",
            2,
            null,
            null,
            null,
            null,
            1),
        new ProjectSeed(
            "proj-mentor-1",
            "menu-2",
            "mentoring",
            "progress",
            "/workspace-hub",
            "대용량 트래픽 커머스",
            "Spring Boot & Redis를 활용한 선착순 쿠폰 시스템 구현 실습",
            20,
            "공통 과제형",
            "fas fa-puzzle-piece mr-1",
            "Backend",
            null,
            "mentor",
            null,
            null,
            null,
            "Jonas",
            "멘토 코드마스터 J",
            "리뷰 대기중",
            "fas fa-comment-dots mr-1",
            2),
        new ProjectSeed(
            "proj-mentor-2",
            "menu-3",
            "mentoring",
            "progress",
            "/workspace-hub",
            "React Native 습관 챌린지 앱",
            "기획부터 앱스토어 런칭까지 한 사이클을 경험하는 실전 프로젝트",
            50,
            "팀 프로젝트형",
            "fas fa-users mr-1",
            "App",
            "💻 Backend",
            "mentor",
            null,
            null,
            null,
            "Mobile",
            "멘토 1명, 팀원 4명",
            "2주차 진행중",
            null,
            3));
  }

  private record ProjectSeed(
      String domId,
      String menuId,
      String type,
      String status,
      String dashboardUrl,
      String title,
      String description,
      int progressPercent,
      String mentoringModeLabel,
      String mentoringModeIcon,
      String categoryLabel,
      String roleLabel,
      String footerKind,
      String footerDateLabel,
      String memberAvatarSeeds,
      Integer extraMemberCount,
      String footerAvatarSeed,
      String footerText,
      String footerMetaText,
      String footerMetaIcon,
      int sortOrder) {}
}
