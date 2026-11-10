package com.devpath.api.showcase.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.devpath.api.showcase.dto.CreateShowcaseCommentRequest;
import com.devpath.api.showcase.dto.CreateShowcaseRequest;
import com.devpath.api.showcase.dto.UpdateShowcaseRequest;
import com.devpath.bootstrap.seed.LocalProjectExperienceSeedInitializer;
import com.devpath.bootstrap.seed.LocalSeedSqlExecutor;
import com.devpath.domain.project.repository.ProjectMemberRepository;
import com.devpath.domain.project.repository.ProjectRepository;
import com.devpath.domain.showcase.entity.Showcase;
import com.devpath.domain.showcase.entity.ShowcaseCategory;
import com.devpath.domain.showcase.entity.ShowcaseComment;
import com.devpath.domain.showcase.entity.ShowcaseLike;
import com.devpath.domain.showcase.entity.ShowcaseSort;
import com.devpath.domain.showcase.repository.ShowcaseCommentRepository;
import com.devpath.domain.showcase.repository.ShowcaseLikeRepository;
import com.devpath.domain.showcase.repository.ShowcaseLinkRepository;
import com.devpath.domain.showcase.repository.ShowcaseRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import jakarta.persistence.EntityManager;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;

@DataJpaTest(
    properties = {
      "spring.jpa.hibernate.ddl-auto=create-drop",
      "spring.sql.init.mode=never",
      "spring.jpa.defer-datasource-initialization=false"
    })
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Import({ShowcaseService.class, ShowcaseSocialService.class})
@ActiveProfiles("test")
class ShowcaseServiceIntegrationTest {

  @Autowired private ShowcaseService service;
  @Autowired private ShowcaseSocialService socialService;
  @Autowired private ShowcaseRepository showcases;
  @Autowired private ShowcaseLinkRepository links;
  @Autowired private ShowcaseCommentRepository comments;
  @Autowired private ShowcaseLikeRepository likes;
  @Autowired private UserRepository users;
  @Autowired private ProjectRepository projects;
  @Autowired private ProjectMemberRepository projectMembers;
  @Autowired private WorkspaceRepository workspaces;
  @Autowired private WorkspaceMemberRepository workspaceMembers;
  @Autowired private DataSource dataSource;
  @Autowired private EntityManager entityManager;

  @Test
  void listAndDetailExposeActualAuthorAndPersistedTechStackWithoutAProfile() {
    User author = saveUser("author@example.test", "이서준");
    CreateShowcaseRequest request = new CreateShowcaseRequest();
    ReflectionTestUtils.setField(request, "title", "포트폴리오 빌더");
    ReflectionTestUtils.setField(request, "category", ShowcaseCategory.FULLSTACK);
    ReflectionTestUtils.setField(request, "techStack", "React, TypeScript, Spring Boot");
    var created = service.createShowcase(author.getId(), request);
    entityManager.flush();
    entityManager.clear();

    var summary = service.getShowcases(null, ShowcaseSort.LATEST).getFirst();
    var detail = service.getShowcase(created.getShowcaseId());
    assertThat(summary.getAuthorName()).isEqualTo("이서준");
    assertThat(detail.getAuthorName()).isEqualTo(summary.getAuthorName());
    assertThat(summary.getTechStack()).isEqualTo("React, TypeScript, Spring Boot");
    assertThat(detail.getTechStack()).isEqualTo(summary.getTechStack());
    assertThat(detail.getAuthorProfileImage()).isNull();
  }

  @Test
  void commentCreationAndListExposeTheCommentAuthorsName() {
    User author = saveUser("author@example.test", "이서준");
    User reviewer = saveUser("reviewer@example.test", "정다은");
    Showcase showcase = saveShowcase(author, "포트폴리오 빌더", "설명");
    CreateShowcaseCommentRequest request = new CreateShowcaseCommentRequest();
    ReflectionTestUtils.setField(request, "content", "편집과 발행 상태를 분리한 점이 좋네요.");

    var created = socialService.addComment(showcase.getId(), reviewer.getId(), request);
    assertThat(created.getAuthorName()).isEqualTo("정다은");
    assertThat(socialService.getComments(showcase.getId()))
        .singleElement()
        .satisfies(comment -> assertThat(comment.getAuthorName()).isEqualTo("정다은"));
    assertThat(service.getShowcase(showcase.getId()).getAuthorName()).isEqualTo("이서준");
  }

  @Test
  void updateSupportsTechStackAndKeepsItWhenAnOlderClientOmitsTheField() {
    User author = saveUser("author@example.test", "이서준");
    Showcase showcase = saveShowcase(author, "포트폴리오 빌더", "설명");
    showcase.updateTechStack("React, PostgreSQL");
    UpdateShowcaseRequest request = new UpdateShowcaseRequest();
    ReflectionTestUtils.setField(request, "title", showcase.getTitle());
    ReflectionTestUtils.setField(request, "category", showcase.getCategory());
    ReflectionTestUtils.setField(request, "isPublic", true);
    assertThat(service.updateShowcase(showcase.getId(), author.getId(), request).getTechStack())
        .isEqualTo("React, PostgreSQL");
    ReflectionTestUtils.setField(request, "techStack", "Vue, TypeScript");
    assertThat(service.updateShowcase(showcase.getId(), author.getId(), request).getTechStack())
        .isEqualTo("Vue, TypeScript");
  }

  @Test
  void seedRefreshEnrichesSixProjectsWithoutDuplicatingOrChangingOtherAuthorsPosts() {
    User learner = saveUser("learner@devpath.com", "이학습");
    User otherAuthor = saveUser("other@example.test", "박지훈");
    Showcase original = saveShowcase(learner, "DevPath 학습 대시보드", "기존 시드 설명");
    original.incrementView();
    Showcase unrelated = saveShowcase(otherAuthor, original.getTitle(), "직접 작성한 별도 게시물");
    comments.save(
        ShowcaseComment.builder()
            .showcaseId(original.getId())
            .userId(otherAuthor.getId())
            .content("직접 남긴 피드백")
            .build());
    likes.save(
        ShowcaseLike.builder().showcaseId(original.getId()).userId(otherAuthor.getId()).build());
    var initializer =
        new LocalProjectExperienceSeedInitializer(
            users,
            projects,
            projectMembers,
            workspaces,
            workspaceMembers,
            showcases,
            links,
            likes,
            comments,
            new BCryptPasswordEncoder(),
            new LocalSeedSqlExecutor(new JdbcTemplate(dataSource)));
    initializer.run();
    entityManager.flush();
    long showcaseCount = showcases.count();
    long commentCount = comments.count();
    long likeCount = likes.count();
    long linkCount = links.count();
    initializer.run();
    entityManager.flush();
    entityManager.clear();

    assertThat(showcases.count()).isEqualTo(7).isEqualTo(showcaseCount);
    assertThat(comments.count()).isEqualTo(commentCount);
    assertThat(likes.count()).isEqualTo(likeCount);
    assertThat(links.count()).isEqualTo(linkCount);
    Showcase refreshed = showcases.findById(original.getId()).orElseThrow();
    assertThat(refreshed.getViewCount()).isEqualTo(1);
    assertThat(likes.countByShowcaseId(refreshed.getId())).isEqualTo(1);
    assertThat(links.findAllByShowcaseId(refreshed.getId())).isEmpty();
    assertThat(refreshed.getTechStack()).contains("React", "Spring Boot");
    assertThat(refreshed.getThumbnailUrl()).isEqualTo("/showcase/learning-dashboard.svg");
    assertThat(refreshed.getDescription()).contains("만들게 된 계기", "핵심 기능", "구현하면서 고민한 점", "다음 개선");
    assertThat(showcases.findById(unrelated.getId()).orElseThrow().getDescription())
        .isEqualTo("직접 작성한 별도 게시물");
    assertThat(comments.findAllByShowcaseIdAndIsDeletedFalseOrderByCreatedAtAsc(original.getId()))
        .singleElement()
        .satisfies(comment -> assertThat(comment.getContent()).isEqualTo("직접 남긴 피드백"));
    assertThat(users.findById(learner.getId()).orElseThrow().getName()).isEqualTo("이학습");
    assertThat(
            showcases.findAllByIsDeletedFalseOrderByCreatedAtDesc().stream()
                .filter(item -> !item.getId().equals(unrelated.getId())))
        .allSatisfy(
            item -> {
              assertThat(item.getDescription().length()).isGreaterThan(400);
              assertThat(item.getTechStack().split(",")).hasSizeGreaterThanOrEqualTo(5);
              assertThat(item.getThumbnailUrl()).startsWith("/showcase/").endsWith(".svg");
            });
  }

  private User saveUser(String email, String name) {
    return users.save(User.builder().email(email).name(name).password("test-password").build());
  }

  private Showcase saveShowcase(User author, String title, String description) {
    return showcases.save(
        Showcase.builder()
            .userId(author.getId())
            .title(title)
            .description(description)
            .category(ShowcaseCategory.FULLSTACK)
            .build());
  }
}
