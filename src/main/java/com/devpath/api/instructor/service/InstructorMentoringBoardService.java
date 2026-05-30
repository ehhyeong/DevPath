package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.mentoring.InstructorMentoringBoardPayload;
import com.devpath.api.instructor.entity.InstructorMentoringBoard;
import com.devpath.api.instructor.repository.InstructorMentoringBoardRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.mentoring.entity.MentoringApplication;
import com.devpath.domain.mentoring.entity.MentoringApplicationStatus;
import com.devpath.domain.mentoring.entity.MentoringPost;
import com.devpath.domain.mentoring.repository.MentoringApplicationRepository;
import com.devpath.domain.mentoring.repository.MentoringPostRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceType;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class InstructorMentoringBoardService {

  private final InstructorMentoringBoardRepository instructorMentoringBoardRepository;
  private final UserRepository userRepository;
  private final WorkspaceRepository workspaceRepository;
  private final MentoringApplicationRepository mentoringApplicationRepository;
  private final MentoringPostRepository mentoringPostRepository;
  private final ObjectMapper objectMapper;

  public InstructorMentoringBoardService(
      InstructorMentoringBoardRepository instructorMentoringBoardRepository,
      UserRepository userRepository,
      WorkspaceRepository workspaceRepository,
      MentoringApplicationRepository mentoringApplicationRepository,
      MentoringPostRepository mentoringPostRepository,
      Optional<ObjectMapper> objectMapper) {
    this.instructorMentoringBoardRepository = instructorMentoringBoardRepository;
    this.userRepository = userRepository;
    this.workspaceRepository = workspaceRepository;
    this.mentoringApplicationRepository = mentoringApplicationRepository;
    this.mentoringPostRepository = mentoringPostRepository;
    this.objectMapper = objectMapper.orElseGet(() -> new ObjectMapper().findAndRegisterModules());
  }

  @Transactional(readOnly = true)
  public InstructorMentoringBoardPayload getBoard(Long instructorId) {
    validateInstructor(instructorId);

    return instructorMentoringBoardRepository
        .findByInstructorId(instructorId)
        .map(InstructorMentoringBoard::getPayloadJson)
        .map(this::readPayload)
        .map(payload -> attachWorkspaceIds(instructorId, payload))
        .map(payload -> attachMentoringPosts(instructorId, payload))
        .map(payload -> attachPendingApplications(instructorId, payload))
        .orElseGet(
            () ->
                attachPendingApplications(
                    instructorId,
                    attachMentoringPosts(instructorId, createDefaultPayload(instructorId))));
  }

  public InstructorMentoringBoardPayload saveBoard(
      Long instructorId, InstructorMentoringBoardPayload payload) {
    validateInstructor(instructorId);

    payload = filterLiveMentoringData(attachWorkspaceIds(instructorId, payload));
    String payloadJson = writePayload(payload);
    InstructorMentoringBoard board =
        instructorMentoringBoardRepository
            .findByInstructorId(instructorId)
            .orElseGet(() -> new InstructorMentoringBoard(instructorId, payloadJson));

    board.updatePayload(payloadJson);
    instructorMentoringBoardRepository.save(board);
    return payload;
  }

  private void validateInstructor(Long instructorId) {
    if (instructorId == null) {
      throw new CustomException(ErrorCode.UNAUTHORIZED);
    }

    if (!userRepository.existsById(instructorId)) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
  }

  private InstructorMentoringBoardPayload readPayload(String payloadJson) {
    try {
      return objectMapper.readValue(payloadJson, InstructorMentoringBoardPayload.class);
    } catch (JsonProcessingException exception) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "Invalid mentoring board payload.");
    }
  }

  private String writePayload(InstructorMentoringBoardPayload payload) {
    try {
      return objectMapper.writeValueAsString(
          payload == null ? new InstructorMentoringBoardPayload() : payload);
    } catch (JsonProcessingException exception) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "Invalid mentoring board payload.");
    }
  }

  private InstructorMentoringBoardPayload createDefaultPayload(Long instructorId) {
    List<Workspace> mentoringWorkspaces = getMentoringWorkspaces(instructorId);
    List<InstructorMentoringBoardPayload.OngoingProjectItem> ongoingProjects =
        mentoringWorkspaces.isEmpty()
            ? List.of(
                new InstructorMentoringBoardPayload.OngoingProjectItem(
                    "ongoing-common-assignment",
                    "대용량 트래픽 커머스 서버",
                    "공통 과제형 멘토링 워크스페이스",
                    3,
                    "study",
                    "Backend",
                    35,
                    "워크스페이스 이동",
                    "일정 관리",
                    List.of("과제 설정", "공지 전송", "멘토링 종료"),
                    null))
            : mentoringWorkspaces.stream().map(this::toOngoingProject).toList();

    return new InstructorMentoringBoardPayload(
        List.of(
            new InstructorMentoringBoardPayload.ProjectItem(
                "commerce",
                "대용량 이커머스 서버 구축",
                "대용량 이커머스 서버",
                "실제 운영 환경과 유사한 이커머스 시나리오를 함께 구현합니다.",
                "study",
                "Backend",
                "모집중",
                8,
                10,
                List.of(),
                List.of("Spring Boot", "Redis", "Kafka", "MySQL"),
                "코드마스터 J",
                "스타트업 백엔드 리드 개발자",
                "쿠폰 발급, 주문 동시성, 캐시 전략까지 운영 감각으로 같이 설계하고 리뷰합니다.",
                4,
                List.of(
                    "요구사항 분석과 ERD 설계", "회원과 상품 API 구현", "주문 처리와 Redis/Kafka 적용", "성능 최적화와 최종 발표")),
            new InstructorMentoringBoardPayload.ProjectItem(
                "travel",
                "AI 여행 코스 추천 서비스",
                "AI 여행 코스",
                "프론트엔드와 백엔드가 함께 협업하는 풀스택 멘토링입니다.",
                "team",
                "Full Stack",
                "모집중",
                4,
                4,
                List.of(createRole("Frontend", 2, 2), createRole("Backend", 2, 2)),
                List.of("React", "Spring Boot", "OpenAI"),
                "조니 J",
                "서비스 기획부터 배포까지 리드한 풀스택 개발자",
                "추천 로직, 일정 UX, 협업 구조까지 실제 서비스처럼 끝까지 끌고 갑니다.",
                6,
                List.of(
                    "문제 정의와 화면 구조 설계",
                    "프론트엔드와 백엔드 역할 분리",
                    "추천 로직과 데이터 파이프라인 구현",
                    "일정 생성 화면 완성",
                    "배포와 운영 설정",
                    "데모데이 발표"))),
        List.of(
            new InstructorMentoringBoardPayload.RequestItem(
                "request-taehyeong",
                "김태형",
                "Taehyeong",
                "어제 14:30",
                "commerce",
                "대용량 이커머스 서버 구축",
                "study",
                "직접 무관",
                "Redis와 동시성 제어를 실전 프로젝트로 익히고 싶습니다.",
                "https://github.com/taehyeong"),
            new InstructorMentoringBoardPayload.RequestItem(
                "request-sarah",
                "김수아",
                "Sarah",
                "오늘 09:15",
                "travel",
                "AI 여행 코스 추천 서비스",
                "team",
                "Frontend",
                "실제 사용자 흐름을 고려한 프론트엔드 협업 경험을 쌓고 싶습니다.",
                "https://sarah-dev.blog")),
        ongoingProjects);
  }

  private InstructorMentoringBoardPayload attachWorkspaceIds(
      Long instructorId, InstructorMentoringBoardPayload payload) {
    if (payload == null) {
      return createDefaultPayload(instructorId);
    }

    List<Workspace> mentoringWorkspaces = getMentoringWorkspaces(instructorId);
    List<InstructorMentoringBoardPayload.OngoingProjectItem> ongoingProjects =
        payload.ongoingProjects() == null ? List.of() : payload.ongoingProjects();

    boolean legacyDefault =
        ongoingProjects.stream()
            .anyMatch(
                item ->
                    "ongoing-legal-chatbot".equals(item.id())
                        || "ongoing-kotlin-study".equals(item.id()));

    if ((ongoingProjects.isEmpty() || legacyDefault) && !mentoringWorkspaces.isEmpty()) {
      ongoingProjects = mentoringWorkspaces.stream().map(this::toOngoingProject).toList();
    } else {
      ongoingProjects =
          ongoingProjects.stream()
              .map(item -> withResolvedWorkspaceId(instructorId, item, mentoringWorkspaces))
              .toList();
    }

    return new InstructorMentoringBoardPayload(
        payload.projects() == null ? List.of() : payload.projects(),
        payload.requests() == null ? List.of() : payload.requests(),
        ongoingProjects);
  }

  private InstructorMentoringBoardPayload filterLiveMentoringData(
      InstructorMentoringBoardPayload payload) {
    if (payload == null) {
      return new InstructorMentoringBoardPayload();
    }

    return new InstructorMentoringBoardPayload(
        payload.projects() == null
            ? List.of()
            : payload.projects().stream().filter(project -> !isLivePostProject(project)).toList(),
        payload.requests() == null
            ? List.of()
            : payload.requests().stream()
                .filter(request -> !isLiveApplicationRequest(request))
                .toList(),
        payload.ongoingProjects() == null ? List.of() : payload.ongoingProjects());
  }

  private InstructorMentoringBoardPayload attachMentoringPosts(
      Long instructorId, InstructorMentoringBoardPayload payload) {
    List<MentoringPost> posts =
        mentoringPostRepository.findAllByMentor_IdAndIsDeletedFalseOrderByCreatedAtDesc(
            instructorId);
    Map<String, InstructorMentoringBoardPayload.ProjectItem> mergedProjects =
        new LinkedHashMap<>();
    posts.forEach(
        post -> {
          InstructorMentoringBoardPayload.ProjectItem projectItem = toProjectItem(post);
          mergedProjects.put(projectItem.id(), projectItem);
        });

    if (payload.projects() != null) {
      payload.projects().stream()
          .filter(project -> !isLivePostProject(project))
          .forEach(project -> mergedProjects.putIfAbsent(project.id(), project));
    }

    return new InstructorMentoringBoardPayload(
        List.copyOf(mergedProjects.values()),
        payload.requests() == null ? List.of() : payload.requests(),
        payload.ongoingProjects() == null ? List.of() : payload.ongoingProjects());
  }

  private boolean isLivePostProject(InstructorMentoringBoardPayload.ProjectItem project) {
    return project != null && project.id() != null && project.id().startsWith("post-");
  }

  private InstructorMentoringBoardPayload.ProjectItem toProjectItem(MentoringPost post) {
    String mode = normalizeMode(post.getMentoringType());
    List<String> tags = splitComma(post.getRequiredStacks());
    List<String> weeks = splitLines(post.getCurriculum());

    return new InstructorMentoringBoardPayload.ProjectItem(
        "post-" + post.getId(),
        post.getTitle(),
        post.getTitle(),
        post.getContent(),
        mode,
        post.getCategory() == null || post.getCategory().isBlank() ? "Backend" : post.getCategory(),
        "OPEN".equals(String.valueOf(post.getStatus())) ? "모집중" : "모집마감",
        post.getCurrentParticipants() == null ? 0 : post.getCurrentParticipants(),
        post.getMaxParticipants() == null ? 1 : post.getMaxParticipants(),
        List.of(),
        tags,
        post.getMentor().getName(),
        (post.getCategory() == null || post.getCategory().isBlank() ? "Backend" : post.getCategory())
            + " 멘토",
        post.getContent(),
        post.getDurationWeeks() == null ? 4 : post.getDurationWeeks(),
        weeks.isEmpty() ? List.of("오리엔테이션", "핵심 기능 구현", "멘토 코드 리뷰", "최종 발표") : weeks);
  }

  private List<String> splitComma(String value) {
    if (value == null || value.isBlank()) {
      return List.of();
    }
    return List.of(value.split(",")).stream().map(String::trim).filter(token -> !token.isBlank()).toList();
  }

  private List<String> splitLines(String value) {
    if (value == null || value.isBlank()) {
      return List.of();
    }
    return value.lines().map(String::trim).filter(token -> !token.isBlank()).toList();
  }

  private InstructorMentoringBoardPayload attachPendingApplications(
      Long instructorId, InstructorMentoringBoardPayload payload) {
    List<MentoringApplication> pendingApplications =
        mentoringApplicationRepository
            .findAllByPost_Mentor_IdAndStatusAndIsDeletedFalseOrderByCreatedAtDesc(
                instructorId, MentoringApplicationStatus.PENDING);

    Map<String, InstructorMentoringBoardPayload.RequestItem> mergedRequests =
        new LinkedHashMap<>();
    pendingApplications.forEach(
        application -> {
          InstructorMentoringBoardPayload.RequestItem requestItem = toRequestItem(application);
          mergedRequests.put(requestItem.id(), requestItem);
        });

    if (payload.requests() != null) {
      payload.requests().stream()
          .filter(request -> !isLiveApplicationRequest(request))
          .forEach(request -> mergedRequests.putIfAbsent(request.id(), request));
    }

    return new InstructorMentoringBoardPayload(
        payload.projects() == null ? List.of() : payload.projects(),
        List.copyOf(mergedRequests.values()),
        payload.ongoingProjects() == null ? List.of() : payload.ongoingProjects());
  }

  private boolean isLiveApplicationRequest(InstructorMentoringBoardPayload.RequestItem request) {
    return request != null && request.id() != null && request.id().startsWith("application-");
  }

  private InstructorMentoringBoardPayload.RequestItem toRequestItem(
      MentoringApplication application) {
    MentoringPost post = application.getPost();
    String mode = normalizeMode(post.getMentoringType());
    String message = application.getMessage() == null ? "" : application.getMessage();

    return new InstructorMentoringBoardPayload.RequestItem(
        "application-" + application.getId(),
        application.getApplicant().getName(),
        application.getApplicant().getName(),
        formatSubmittedAt(application.getCreatedAt()),
        "post-" + post.getId(),
        post.getTitle(),
        mode,
        resolveRole(mode, application.getDesiredPosition()),
        stripPortfolioLine(message),
        extractPortfolioUrl(message));
  }

  private String normalizeMode(String mentoringType) {
    return "team".equalsIgnoreCase(mentoringType) ? "team" : "study";
  }

  private String resolveRole(String mode, String desiredPosition) {
    if ("team".equals(mode)) {
      return desiredPosition == null || desiredPosition.isBlank() ? "직군 미정" : desiredPosition;
    }
    return "직접 무관";
  }

  private String stripPortfolioLine(String message) {
    return message
        .lines()
        .filter(line -> !line.trim().startsWith("포트폴리오:"))
        .reduce((left, right) -> left + "\n" + right)
        .orElse("")
        .trim();
  }

  private String extractPortfolioUrl(String message) {
    return message
        .lines()
        .map(String::trim)
        .filter(line -> line.startsWith("포트폴리오:"))
        .map(line -> line.substring("포트폴리오:".length()).trim())
        .filter(value -> !value.isBlank())
        .findFirst()
        .orElse("");
  }

  private String formatSubmittedAt(LocalDateTime createdAt) {
    if (createdAt == null) {
      return "방금 전";
    }

    Duration duration = Duration.between(createdAt, LocalDateTime.now());
    long minutes = Math.max(0, duration.toMinutes());
    if (minutes < 1) {
      return "방금 전";
    }
    if (minutes < 60) {
      return minutes + "분 전";
    }
    long hours = duration.toHours();
    if (hours < 24) {
      return hours + "시간 전";
    }
    long days = duration.toDays();
    if (days == 1) {
      return "어제";
    }
    if (days < 7) {
      return days + "일 전";
    }
    return createdAt.toLocalDate().toString();
  }

  private InstructorMentoringBoardPayload.OngoingProjectItem withResolvedWorkspaceId(
      Long instructorId,
      InstructorMentoringBoardPayload.OngoingProjectItem item,
      List<Workspace> mentoringWorkspaces) {
    if (item.workspaceId() != null
        && workspaceRepository.existsByIdAndOwnerIdAndIsDeletedFalse(
            item.workspaceId(), instructorId)) {
      return item;
    }

    Workspace workspace = findMatchingWorkspace(item, mentoringWorkspaces).orElse(null);
    return new InstructorMentoringBoardPayload.OngoingProjectItem(
        item.id(),
        item.title(),
        item.subtitle(),
        item.week(),
        item.mode(),
        item.category(),
        item.progress(),
        item.primaryAction(),
        item.secondaryAction(),
        item.menuActions(),
        workspace == null ? null : workspace.getId());
  }

  private Optional<Workspace> findMatchingWorkspace(
      InstructorMentoringBoardPayload.OngoingProjectItem item, List<Workspace> workspaces) {
    Optional<Workspace> byTitle =
        workspaces.stream()
            .filter(
                workspace ->
                    item.title() != null
                        && (item.title().contains(workspace.getName())
                            || workspace.getName().contains(item.title())))
            .findFirst();
    if (byTitle.isPresent()) {
      return byTitle;
    }

    if ("team".equals(item.mode())) {
      return workspaces.stream()
          .filter(workspace -> workspace.getName().contains("Next"))
          .findFirst();
    }

    return workspaces.stream()
        .filter(workspace -> workspace.getName().contains("대용량") || workspace.getName().contains("커머스"))
        .findFirst()
        .or(() -> workspaces.stream().findFirst());
  }

  private InstructorMentoringBoardPayload.OngoingProjectItem toOngoingProject(Workspace workspace) {
    boolean teamMode = workspace.getName().contains("Next") || workspace.getName().contains("팀");
    return new InstructorMentoringBoardPayload.OngoingProjectItem(
        "ongoing-workspace-" + workspace.getId(),
        workspace.getName(),
        workspace.getDescription() == null ? "멘토링 워크스페이스" : workspace.getDescription(),
        teamMode ? 2 : 3,
        teamMode ? "team" : "study",
        teamMode ? "Frontend" : "Backend",
        teamMode ? 50 : 35,
        "워크스페이스 이동",
        "일정 관리",
        teamMode
            ? List.of("워크스페이스 설정", "멤버 관리", "완료 처리")
            : List.of("과제 설정", "공지 전송", "멘토링 종료"),
        workspace.getId());
  }

  private List<Workspace> getMentoringWorkspaces(Long instructorId) {
    return workspaceRepository.findAllByOwnerIdAndTypeAndIsDeletedFalseOrderByCreatedAtDesc(
        instructorId, WorkspaceType.MENTORING);
  }

  private InstructorMentoringBoardPayload.RoleItem createRole(String name, int current, int total) {
    return new InstructorMentoringBoardPayload.RoleItem(name, current, total);
  }
}
