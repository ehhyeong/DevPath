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
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class WorkspaceDemoScenario {

  static final String OWNER_EMAIL = "kim.hakseup@devpath.com";
  static final String REVIEW_KEY = "routinecare-records-v1#1";
  static final String FILE_PATH = "src/main/java/com/routinecare/record/DailyRecordService.java";
  static final long DESIGN_DELAY_MILLIS = 7500L;
  static final long REVIEW_DELAY_MILLIS = 5500L;

  private final UserRepository users;
  private final WorkspaceRepository workspaces;
  private final WorkspaceMemberRepository members;
  private final WorkspaceAiDesignRepository designs;
  private final WorkspaceCodeReviewStore reviews;
  private final ObjectMapper mapper;

  boolean isDemoUser(Long userId) {
    return userId != null && users.findById(userId).filter(this::isDemoOwner).isPresent();
  }

  boolean supports(Long userId, WorkspaceAiDesignRequest request) {
    // 직접 입력한 아이디어와 스택은 실제 생성 기능으로 남기고 기본 MVP 추천만 고정 시연한다.
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
        .filter(workspace -> reviews.hasDemoReview(workspaceId, REVIEW_KEY))
        .isPresent();
  }

  WorkspaceAiDesignResponse design(WorkspaceAiDesignRequest request) {
    pause(DESIGN_DELAY_MILLIS);
    try (var input =
        new ClassPathResource("demo/workspace/routinecare-design.json").getInputStream()) {
      return mapper
          .readValue(input, WorkspaceAiDesignResponse.class)
          .withDifficulty(request.difficulty());
    } catch (IOException exception) {
      throw new IllegalStateException("시연 프로젝트 설계 데이터를 읽지 못했습니다.", exception);
    }
  }

  // 생성 서비스의 트랜잭션에 참여해 설계·팀원·PR이 함께 커밋되거나 함께 롤백된다.
  void initialize(Workspace workspace, WorkspaceAiDesignResponse design) {
    if (!"식단 및 복약 순응도 추적 플랫폼 (RoutineCare)".equals(design.title())
        || !isDemoUser(workspace.getOwnerId())) return;
    for (String email : List.of("park.juseung@devpath.com", "kim.taehyung@devpath.com")) {
      User user =
          users
              .findByEmail(email)
              .filter(
                  candidate ->
                      candidate.canAuthenticate() && candidate.getRole() == UserRole.ROLE_LEARNER)
              .orElseThrow(() -> new IllegalStateException("시연 팀원 계정을 확인해 주세요. " + email));
      if (!members.existsByWorkspaceIdAndLearnerId(workspace.getId(), user.getId())) {
        members.save(
            WorkspaceMember.builder()
                .workspaceId(workspace.getId())
                .learnerId(user.getId())
                .build());
      }
    }
    if (reviews.hasDemoReview(workspace.getId(), REVIEW_KEY)) return;
    String diff =
        """
        diff --git a/src/main/java/com/routinecare/record/DailyRecordService.java b/src/main/java/com/routinecare/record/DailyRecordService.java
        --- a/src/main/java/com/routinecare/record/DailyRecordService.java
        +++ b/src/main/java/com/routinecare/record/DailyRecordService.java
        @@ -1,5 +1,15 @@
         package com.routinecare.record;

         @Service
         @RequiredArgsConstructor
         public class DailyRecordService {
        +    private final DailyRecordRepository records;
        +
        +    @Transactional
        +    public DailyRecord record(Long memberId, LocalDate date, String meal, boolean medicationTaken) {
        +        DailyRecord record = records.findByMemberIdAndDate(memberId, date)
        +            .orElseGet(() -> new DailyRecord(memberId, date));
        +        record.update(meal, medicationTaken);
        +        return records.save(record);
        +    }
        +
         }
        """;
    long additions =
        diff.lines().filter(line -> line.startsWith("+") && !line.startsWith("+++")).count();
    Long reviewId =
        reviews.createReview(
            workspace.getId(),
            workspace.getOwnerId(),
            "feat: RoutineCare 일별 식단·복약 기록 저장 API",
            "POST /api/daily-records 구현 PR입니다. 같은 날짜의 기록 갱신, 사용자별 접근 권한, 중복 저장을 검토해 주세요.",
            null,
            FILE_PATH,
            diff,
            "feature/daily-records",
            "main",
            (int) additions,
            0);
    reviews.markDemoReview(workspace.getId(), reviewId, REVIEW_KEY);
  }

  boolean isDemoReview(Long workspaceId, WorkspaceCodeReviewStore.DetailRow row) {
    return "DEMO".equals(row.externalProvider())
        && REVIEW_KEY.equals(row.externalId())
        && isDemoWorkspace(workspaceId);
  }

  void review(Long workspaceId, Long reviewId, Long userId, String selectedFilePath, String diff) {
    pause(REVIEW_DELAY_MILLIS);
    Long aiReviewId =
        reviews.createDemoAiReview(
            userId,
            "RoutineCare 식단·복약 기록 API 검토",
            diff,
            "일별 기록 생성과 수정 흐름은 명확합니다. 사용자 권한 검증, 동시 저장 시 중복 방지, 날짜 경계 테스트를 보완하면 안전하게 운영할 수 있습니다.",
            "DEMO");
    reviews.insertDemoAiReviewComment(
        aiReviewId,
        "보안",
        9,
        "사용자 ID는 인증 정보에서 확인",
        "요청의 memberId만 신뢰하면 다른 사용자의 복약 기록을 변경할 수 있습니다.",
        "컨트롤러에서 인증된 사용자 ID를 전달하고 서비스에서 기록 소유권을 검증하세요.");
    reviews.insertDemoAiReviewComment(
        aiReviewId,
        "데이터 정합성",
        10,
        "같은 날짜의 동시 저장 방지",
        "조회 후 생성 사이에 요청이 겹치면 같은 사용자의 일별 기록이 중복 생성될 수 있습니다.",
        "daily_records의 member_id와 record_date에 UNIQUE 제약을 두고 충돌 정책을 정의하세요.");
    reviews.insertDemoAiReviewComment(
        aiReviewId,
        "테스트",
        12,
        "복약 상태 갱신과 날짜 경계 검증",
        "기존 식단 기록에서 복약 상태만 바꾸는 경우와 자정 전후의 기록 날짜를 확인해야 합니다.",
        "동일 날짜 재저장, 다른 사용자 접근 거부, 시간대별 날짜 경계 테스트를 추가하세요.");
    reviews.attachAiReview(workspaceId, reviewId, aiReviewId, selectedFilePath);
  }

  private boolean isDemoOwner(User user) {
    return OWNER_EMAIL.equalsIgnoreCase(user.getEmail())
        && user.canAuthenticate()
        && user.getRole() == UserRole.ROLE_LEARNER;
  }

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
