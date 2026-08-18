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
  private final LocalSeedSqlExecutor seedSqlExecutor;

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
    return seedSqlExecutor.query(
        "db/local/workspace-hub-project-seeds.sql",
        (resultSet, rowNumber) ->
            new ProjectSeed(
                resultSet.getString("dom_id"),
                resultSet.getString("menu_id"),
                resultSet.getString("card_type"),
                resultSet.getString("card_status"),
                resultSet.getString("dashboard_url"),
                resultSet.getString("title"),
                resultSet.getString("description"),
                resultSet.getInt("progress_percent"),
                resultSet.getString("mentoring_mode_label"),
                resultSet.getString("mentoring_mode_icon"),
                resultSet.getString("category_label"),
                resultSet.getString("role_label"),
                resultSet.getString("footer_kind"),
                resultSet.getString("footer_date_label"),
                resultSet.getString("member_avatar_seeds"),
                resultSet.getObject("extra_member_count", Integer.class),
                resultSet.getString("footer_avatar_seed"),
                resultSet.getString("footer_text"),
                resultSet.getString("footer_meta_text"),
                resultSet.getString("footer_meta_icon"),
                resultSet.getInt("sort_order")));
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
