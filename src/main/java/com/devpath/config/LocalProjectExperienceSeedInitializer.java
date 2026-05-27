package com.devpath.config;

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
import java.util.List;
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

  @Override
  @Transactional
  public void run(String... args) {
    List<User> users =
        List.of(
            ensureUser("project.frontend@devpath.com", "이서준"),
            ensureUser("project.backend@devpath.com", "정다은"),
            ensureUser("project.pm@devpath.com", "최민지"),
            ensureUser("project.ai@devpath.com", "오서연"));

    seedProjectWorkspace(
        users.get(0),
        "포트폴리오 빌더 솔로",
        "개인 포트폴리오 제작을 위한 솔로 워크스페이스. React, Spring Boot, PDF 자동화를 실험합니다.",
        ProjectType.SOLO,
        WorkspaceType.SOLO,
        ProjectStatus.IN_PROGRESS,
        List.of(users.get(0)));
    seedProjectWorkspace(
        users.get(1),
        "DevPath 팀 워크스페이스",
        "팀 협업과 멘토링 리뷰 흐름을 검증하는 스쿼드 워크스페이스. API, 알림, 회의 기록을 연결합니다.",
        ProjectType.SQUAD,
        WorkspaceType.SQUAD,
        ProjectStatus.IN_PROGRESS,
        users);
    seedProjectWorkspace(
        users.get(2),
        "Next.js 스터디 운영툴",
        "스터디 모집부터 과제 제출까지 운영하는 프로젝트. 진행 기록과 쇼케이스 제출을 함께 관리합니다.",
        ProjectType.SQUAD,
        WorkspaceType.SQUAD,
        ProjectStatus.COMPLETED,
        List.of(users.get(0), users.get(2), users.get(3)));

    seedShowcase(
        users.get(0),
        "DevPath 포트폴리오 빌더",
        "학습 기록과 프로젝트 경험을 모아 PDF 포트폴리오로 정리하는 웹 서비스입니다.",
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900",
        ShowcaseCategory.FULLSTACK,
        36,
        users);
    seedShowcase(
        users.get(1),
        "AI 코드 리뷰 대시보드",
        "PR 리뷰 결과를 위험도, 수정 가이드, 히스토리로 분류해서 팀 단위로 추적합니다.",
        "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=900",
        ShowcaseCategory.AI,
        42,
        users);
    seedShowcase(
        users.get(3),
        "스터디 매칭 모바일 MVP",
        "관심 스택과 시간대를 기반으로 스터디원을 추천하고 출석을 관리하는 모바일 MVP입니다.",
        "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=900",
        ShowcaseCategory.MOBILE,
        28,
        users);
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
}
