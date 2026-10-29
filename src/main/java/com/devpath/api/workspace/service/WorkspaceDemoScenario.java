package com.devpath.api.workspace.service;

import com.devpath.api.workspace.dto.WorkspaceAiDesignRequest;
import com.devpath.api.workspace.dto.WorkspaceAiDesignResponse;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceMember;
import com.devpath.domain.workspace.repository.WorkspaceAiDesignRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Component
class WorkspaceDemoScenario {

  static final String OWNER_EMAIL = "kim.hakseup@devpath.com";
  static final String REVIEW_KEY = "routinecare-records-v1#1";
  static final long DESIGN_DELAY_MILLIS = 7500L;
  static final long REVIEW_DELAY_MILLIS = 5500L;
  static final String TAEHYUNG_COMMENT =
      "memberId는 요청 본문 대신 인증된 사용자 정보에서 가져오면 좋겠습니다. 같은 사용자가 같은 날짜에 동시에 저장해도 기록이 중복되지 않도록 member_id·record_date 유니크 제약도 확인해 주세요.";

  private final UserRepository users;
  private final WorkspaceRepository workspaces;
  private final WorkspaceMemberRepository members;
  private final WorkspaceAiDesignRepository designs;
  private final WorkspaceCodeReviewStore reviews;
  private final ObjectMapper mapper;
  private final List<DemoProject> projects;

  WorkspaceDemoScenario(
      UserRepository users,
      WorkspaceRepository workspaces,
      WorkspaceMemberRepository members,
      WorkspaceAiDesignRepository designs,
      WorkspaceCodeReviewStore reviews,
      ObjectMapper mapper) {
    this.users = users;
    this.workspaces = workspaces;
    this.members = members;
    this.designs = designs;
    this.reviews = reviews;
    this.mapper = mapper;
    this.projects =
        List.of("routinecare", "studymate", "pantryshare", "sprintdesk").stream()
            .map(
                id ->
                    new DemoProject(
                        read(id + "-design.json", WorkspaceAiDesignResponse.class),
                        read(id + "-review.json", ReviewSeed.class)))
            .toList();
  }

  boolean isDemoUser(Long userId) {
    return userId != null && users.findById(userId).filter(this::isDemoOwner).isPresent();
  }

  boolean supports(Long userId, WorkspaceAiDesignRequest request) {
    // 직접 입력한 아이디어와 스택은 실제 생성 기능으로 남기고 기본 MVP 추천만 준비된 시드로 시연한다.
    return "mvp".equals(request.difficulty())
        && "auto".equals(request.stackMode())
        && request.normalizedIdea().isBlank()
        && isDemoUser(userId);
  }

  boolean isDemoWorkspace(Long workspaceId) {
    // 계정명이나 URL의 ai 플래그만으로 미연동 접근을 열지 않고 서버가 만든 시연 PR까지 확인한다.
    return workspaces
        .findById(workspaceId)
        .filter(workspace -> !workspace.isDeleted() && isDemoUser(workspace.getOwnerId()))
        .filter(workspace -> designs.findByWorkspaceId(workspaceId).isPresent())
        .filter(
            workspace ->
                projects.stream()
                    .anyMatch(
                        project -> reviews.hasDemoReview(workspaceId, project.review().key())))
        .isPresent();
  }

  WorkspaceAiDesignResponse design(WorkspaceAiDesignRequest request) {
    pause(DESIGN_DELAY_MILLIS);
    // 0~3의 균등한 정수 선택이므로 각 주제는 매번 25%이며 연속 중복도 허용한다.
    return projects
        .get(ThreadLocalRandom.current().nextInt(projects.size()))
        .design()
        .withDifficulty(request.difficulty());
  }

  // 생성 서비스의 트랜잭션에 참여해 설계·팀원·PR이 함께 커밋되거나 함께 롤백된다.
  void initialize(Workspace workspace, WorkspaceAiDesignResponse design) {
    DemoProject project =
        projects.stream()
            .filter(candidate -> candidate.design().title().equals(design.title()))
            .findFirst()
            .orElse(null);
    if (project == null || !isDemoUser(workspace.getOwnerId())) return;
    ReviewSeed review = project.review();
    List<User> invitedMembers = new ArrayList<>();
    for (String email : List.of("park.juseung@devpath.com", "kim.taehyung@devpath.com")) {
      User user =
          users
              .findByEmail(email)
              .filter(
                  candidate ->
                      candidate.canAuthenticate() && candidate.getRole() == UserRole.ROLE_LEARNER)
              .orElseThrow(() -> new IllegalStateException("시연 팀원 계정을 확인해 주세요. " + email));
      invitedMembers.add(user);
      if (!members.existsByWorkspaceIdAndLearnerId(workspace.getId(), user.getId())) {
        members.save(
            WorkspaceMember.builder()
                .workspaceId(workspace.getId())
                .learnerId(user.getId())
                .build());
      }
    }
    if (reviews.hasDemoReview(workspace.getId(), review.key())) return;
    String diff = review.diff();
    long additions =
        diff.lines().filter(line -> line.startsWith("+") && !line.startsWith("+++")).count();
    Long reviewId =
        reviews.createReview(
            workspace.getId(),
            workspace.getOwnerId(),
            review.title(),
            review.description(),
            null,
            review.filePath(),
            diff,
            review.sourceBranch(),
            "main",
            (int) additions,
            0);
    reviews.markDemoReview(workspace.getId(), reviewId, review.key());
    for (User member : invitedMembers) {
      reviews.insertMemberComment(
          workspace.getId(),
          reviewId,
          member.getId(),
          review.filePath(),
          "kim.taehyung@devpath.com".equals(member.getEmail())
              ? review.taehyungComment()
              : review.juseungComment());
    }
  }

  boolean isDemoReview(Long workspaceId, WorkspaceCodeReviewStore.DetailRow row) {
    return "DEMO".equals(row.externalProvider())
        && projects.stream().anyMatch(project -> project.review().key().equals(row.externalId()))
        && isDemoWorkspace(workspaceId);
  }

  void review(
      Long workspaceId,
      Long reviewId,
      Long userId,
      String selectedFilePath,
      String diff,
      String key) {
    pause(REVIEW_DELAY_MILLIS);
    ReviewSeed review =
        projects.stream()
            .map(DemoProject::review)
            .filter(candidate -> candidate.key().equals(key))
            .findFirst()
            .orElseThrow();
    Long aiReviewId =
        reviews.createDemoAiReview(userId, review.aiTitle(), diff, review.aiSummary(), "DEMO");
    for (ReviewComment comment : review.aiComments()) {
      reviews.insertDemoAiReviewComment(
          aiReviewId,
          comment.category(),
          comment.lineNumber(),
          comment.title(),
          comment.message(),
          comment.suggestion());
    }
    reviews.attachAiReview(workspaceId, reviewId, aiReviewId, selectedFilePath);
  }

  private boolean isDemoOwner(User user) {
    return OWNER_EMAIL.equalsIgnoreCase(user.getEmail())
        && user.canAuthenticate()
        && user.getRole() == UserRole.ROLE_LEARNER;
  }

  private <T> T read(String name, Class<T> type) {
    try (var input = new ClassPathResource("demo/workspace/" + name).getInputStream()) {
      return mapper.readValue(input, type);
    } catch (IOException exception) {
      throw new IllegalStateException("시연 프로젝트 데이터를 읽지 못했습니다. " + name, exception);
    }
  }

  private record DemoProject(WorkspaceAiDesignResponse design, ReviewSeed review) {}

  private record ReviewSeed(
      String key,
      String filePath,
      String title,
      String description,
      String sourceBranch,
      String diff,
      String juseungComment,
      String taehyungComment,
      String aiTitle,
      String aiSummary,
      List<ReviewComment> aiComments) {}

  private record ReviewComment(
      String category, int lineNumber, String title, String message, String suggestion) {}

  private void pause(long millis) {
    try {
      // 준비된 응답도 실제 비동기 생성/리뷰 진행 화면을 시연할 수 있도록 일정 시간 대기한다.
      Thread.sleep(millis);
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("시연 작업이 중단되었습니다.", exception);
    }
  }
}
