package com.devpath.bootstrap.seed;

import com.devpath.domain.project.entity.Project;
import com.devpath.domain.project.entity.ProjectMember;
import com.devpath.domain.project.entity.ProjectRecruitingStatus;
import com.devpath.domain.project.entity.ProjectRoleType;
import com.devpath.domain.project.entity.ProjectStatus;
import com.devpath.domain.project.entity.ProjectType;
import com.devpath.domain.project.entity.ProjectVisibility;
import com.devpath.domain.project.repository.ProjectMemberRepository;
import com.devpath.domain.project.repository.ProjectRepository;
import com.devpath.domain.showcase.entity.Showcase;
import com.devpath.domain.showcase.entity.ShowcaseCategory;
import com.devpath.domain.showcase.entity.ShowcaseComment;
import com.devpath.domain.showcase.entity.ShowcaseLike;
import com.devpath.domain.showcase.entity.ShowcaseLink;
import com.devpath.domain.showcase.entity.ShowcaseLinkType;
import com.devpath.domain.showcase.repository.ShowcaseCommentRepository;
import com.devpath.domain.showcase.repository.ShowcaseLikeRepository;
import com.devpath.domain.showcase.repository.ShowcaseLinkRepository;
import com.devpath.domain.showcase.repository.ShowcaseRepository;
import com.devpath.domain.user.entity.AccountStatus;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceMember;
import com.devpath.domain.workspace.entity.WorkspaceType;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile({"local", "dev"})
@Order(Ordered.HIGHEST_PRECEDENCE + 4)
@RequiredArgsConstructor
public class LocalProjectExperienceSeedInitializer implements CommandLineRunner {

  private static final String SEED_PASSWORD = "devpath1234";

  private final UserRepository userRepository;
  private final ProjectRepository projectRepository;
  private final ProjectMemberRepository projectMemberRepository;
  private final WorkspaceRepository workspaceRepository;
  private final WorkspaceMemberRepository workspaceMemberRepository;
  private final ShowcaseRepository showcaseRepository;
  private final ShowcaseLinkRepository showcaseLinkRepository;
  private final ShowcaseLikeRepository showcaseLikeRepository;
  private final ShowcaseCommentRepository showcaseCommentRepository;
  private final PasswordEncoder passwordEncoder;
  private final LocalSeedSqlExecutor seedSqlExecutor;

  @Override
  @Transactional
  public void run(String... args) {
    Map<String, User> usersByEmail = ensureUsers();
    List<User> users = List.copyOf(usersByEmail.values());

    projectSeeds()
        .forEach(
            seed ->
                seedProjectWorkspace(
                    usersByEmail.get(seed.ownerEmail()),
                    seed.name(),
                    seed.description(),
                    seed.projectType(),
                    seed.workspaceType(),
                    seed.status(),
                    users(seed.memberEmails(), usersByEmail)));

    showcaseSeeds()
        .forEach(
            seed ->
                seedShowcase(
                    usersByEmail.get(seed.ownerEmail()),
                    seed.title(),
                    seed.description(),
                    seed.thumbnailUrl(),
                    seed.category(),
                    seed.initialViews(),
                    users));
  }

  private Map<String, User> ensureUsers() {
    Map<String, User> usersByEmail = new LinkedHashMap<>();
    userSeeds()
        .forEach(seed -> usersByEmail.put(seed.email(), ensureUser(seed.email(), seed.name())));
    return usersByEmail;
  }

  private User ensureUser(String email, String name) {
    return userRepository
        .findByEmail(email)
        .map(user -> restoreUser(user, name))
        .orElseGet(
            () ->
                userRepository.save(
                    User.builder()
                        .email(email)
                        .password(passwordEncoder.encode(SEED_PASSWORD))
                        .name(name)
                        .role(UserRole.ROLE_LEARNER)
                        .build()));
  }

  private User restoreUser(User user, String name) {
    if (!name.equals(user.getName())) {
      user.updateName(name);
    }
    if (!passwordEncoder.matches(SEED_PASSWORD, user.getPassword())) {
      user.changePassword(passwordEncoder.encode(SEED_PASSWORD));
    }
    if (!Boolean.TRUE.equals(user.getIsActive())
        || user.getAccountStatus() != AccountStatus.ACTIVE) {
      user.restore();
    }
    return user;
  }

  private void seedProjectWorkspace(
      User owner,
      String name,
      String description,
      ProjectType projectType,
      WorkspaceType workspaceType,
      ProjectStatus status,
      List<User> members) {
    Project project =
        projectRepository
            .findByNameAndOwnerIdAndIsDeletedFalse(name, owner.getId())
            .orElseGet(
                () ->
                    projectRepository.save(
                        Project.builder()
                            .ownerId(owner.getId())
                            .name(name)
                            .description(description)
                            .projectType(projectType)
                            .status(status)
                            .visibility(ProjectVisibility.PUBLIC)
                            .recruitingStatus(ProjectRecruitingStatus.CLOSED)
                            .build()));
    project.changeStatus(status);
    project.changeVisibility(ProjectVisibility.PUBLIC);
    project.changeRecruitingStatus(ProjectRecruitingStatus.CLOSED);
    ensureProjectMember(project.getId(), owner.getId(), ProjectRoleType.LEADER);
    members.stream()
        .filter(member -> !member.getId().equals(owner.getId()))
        .forEach(
            member ->
                ensureProjectMember(project.getId(), member.getId(), ProjectRoleType.FULLSTACK));

    Workspace workspace =
        workspaceRepository
            .findByNameAndOwnerIdAndIsDeletedFalse(name, owner.getId())
            .orElseGet(
                () ->
                    workspaceRepository.save(
                        Workspace.builder()
                            .ownerId(owner.getId())
                            .name(name)
                            .description(description)
                            .type(workspaceType)
                            .build()));
    members.forEach(member -> ensureWorkspaceMember(workspace.getId(), member.getId()));
  }

  private void ensureProjectMember(Long projectId, Long learnerId, ProjectRoleType roleType) {
    if (projectMemberRepository.existsByProjectIdAndLearnerId(projectId, learnerId)) {
      return;
    }
    projectMemberRepository.save(
        ProjectMember.builder()
            .projectId(projectId)
            .learnerId(learnerId)
            .roleType(roleType)
            .build());
  }

  private void ensureWorkspaceMember(Long workspaceId, Long learnerId) {
    if (workspaceMemberRepository.existsByWorkspaceIdAndLearnerId(workspaceId, learnerId)) {
      return;
    }
    workspaceMemberRepository.save(
        WorkspaceMember.builder().workspaceId(workspaceId).learnerId(learnerId).build());
  }

  private void seedShowcase(
      User owner,
      String title,
      String description,
      String thumbnailUrl,
      ShowcaseCategory category,
      int initialViews,
      List<User> users) {
    Showcase showcase =
        showcaseRepository
            .findByTitleAndUserIdAndIsDeletedFalse(title, owner.getId())
            .orElseGet(
                () -> {
                  Showcase created =
                      Showcase.builder()
                          .userId(owner.getId())
                          .title(title)
                          .description(description)
                          .thumbnailUrl(thumbnailUrl)
                          .category(category)
                          .isPublic(true)
                          .build();
                  for (int i = 0; i < initialViews; i++) {
                    created.incrementView();
                  }
                  return showcaseRepository.save(created);
                });
    showcase.update(title, description, thumbnailUrl, category, true);
    ensureShowcaseLinks(showcase);
    ensureShowcaseSocial(showcase, owner, users);
  }

  private void ensureShowcaseLinks(Showcase showcase) {
    if (!showcaseLinkRepository.findAllByShowcaseId(showcase.getId()).isEmpty()) {
      return;
    }
    showcaseLinkRepository.saveAll(
        List.of(
            ShowcaseLink.builder()
                .showcaseId(showcase.getId())
                .linkType(ShowcaseLinkType.GITHUB)
                .url("https://github.com/ehhyeong/DevPath")
                .build(),
            ShowcaseLink.builder()
                .showcaseId(showcase.getId())
                .linkType(ShowcaseLinkType.DEMO)
                .url("https://devpath.local/showcase/" + showcase.getId())
                .build()));
  }

  private void ensureShowcaseSocial(Showcase showcase, User owner, List<User> users) {
    users.stream()
        .filter(
            user ->
                !showcaseLikeRepository.existsByShowcaseIdAndUserId(showcase.getId(), user.getId()))
        .forEach(
            user ->
                showcaseLikeRepository.save(
                    ShowcaseLike.builder()
                        .showcaseId(showcase.getId())
                        .userId(user.getId())
                        .build()));

    if (!showcaseCommentRepository
        .findAllByShowcaseIdAndIsDeletedFalseOrderByCreatedAtAsc(showcase.getId())
        .isEmpty()) {
      return;
    }
    users.stream()
        .filter(user -> !user.getId().equals(owner.getId()))
        .limit(2)
        .forEach(
            user ->
                showcaseCommentRepository.save(
                    ShowcaseComment.builder()
                        .showcaseId(showcase.getId())
                        .userId(user.getId())
                        .content("완성도가 좋아요. 다음 스프린트에서 회고까지 남기면 더 설득력 있겠습니다.")
                        .build()));
  }

  private List<UserSeed> userSeeds() {
    return seedSqlExecutor.query(
        "db/local/project-experience-users.sql",
        (resultSet, rowNumber) ->
            new UserSeed(resultSet.getString("email"), resultSet.getString("name")));
  }

  private List<ProjectSeed> projectSeeds() {
    return seedSqlExecutor.query(
        "db/local/project-experience-projects.sql",
        (resultSet, rowNumber) ->
            new ProjectSeed(
                resultSet.getString("owner_email"),
                resultSet.getString("name"),
                resultSet.getString("description"),
                ProjectType.valueOf(resultSet.getString("project_type")),
                WorkspaceType.valueOf(resultSet.getString("workspace_type")),
                ProjectStatus.valueOf(resultSet.getString("project_status")),
                resultSet.getString("member_emails")));
  }

  private List<ShowcaseSeed> showcaseSeeds() {
    return seedSqlExecutor.query(
        "db/local/project-experience-showcases.sql",
        (resultSet, rowNumber) ->
            new ShowcaseSeed(
                resultSet.getString("owner_email"),
                resultSet.getString("title"),
                resultSet.getString("description"),
                resultSet.getString("thumbnail_url"),
                ShowcaseCategory.valueOf(resultSet.getString("category")),
                resultSet.getInt("initial_views")));
  }

  private List<User> users(String emails, Map<String, User> usersByEmail) {
    return List.of(emails.split(",")).stream().map(usersByEmail::get).toList();
  }

  private record UserSeed(String email, String name) {}

  private record ProjectSeed(
      String ownerEmail,
      String name,
      String description,
      ProjectType projectType,
      WorkspaceType workspaceType,
      ProjectStatus status,
      String memberEmails) {}

  private record ShowcaseSeed(
      String ownerEmail,
      String title,
      String description,
      String thumbnailUrl,
      ShowcaseCategory category,
      int initialViews) {}
}
