package com.devpath.config;

import com.devpath.domain.mentoring.entity.MentoringPost;
import com.devpath.domain.mentoring.repository.MentoringPostRepository;
import com.devpath.domain.user.entity.AccountStatus;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.time.LocalDate;
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
@Order(Ordered.HIGHEST_PRECEDENCE + 3)
@RequiredArgsConstructor
public class LocalMentoringHubSeedInitializer implements CommandLineRunner {

  private static final String SEED_PASSWORD = "devpath1234";

  private final UserRepository userRepository;
  private final UserProfileRepository userProfileRepository;
  private final MentoringPostRepository mentoringPostRepository;
  private final PasswordEncoder passwordEncoder;

  @Override
  @Transactional
  public void run(String... args) {
    List<PostSeed> seeds = mentoringSeeds();
    seeds.forEach(seed -> ensureProfile(ensureMentor(seed.mentor()), seed.mentor()));
    seeds.forEach(this::ensurePost);
  }

  private User ensureMentor(MentorSeed seed) {
    return userRepository
        .findByEmail(seed.email())
        .map(user -> restoreMentor(user, seed))
        .orElseGet(() -> createMentor(seed));
  }

  private User createMentor(MentorSeed seed) {
    return userRepository.save(
        User.builder()
            .email(seed.email())
            .password(passwordEncoder.encode(SEED_PASSWORD))
            .name(seed.name())
            .role(UserRole.ROLE_INSTRUCTOR)
            .build());
  }

  private User restoreMentor(User user, MentorSeed seed) {
    if (!seed.name().equals(user.getName())) {
      user.updateName(seed.name());
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

  private void ensureProfile(User user, MentorSeed seed) {
    UserProfile profile =
        userProfileRepository
            .findByUserId(user.getId())
            .orElseGet(
                () ->
                    UserProfile.builder()
                        .user(user)
                        .profileImage(seed.profileImage())
                        .channelName(seed.name())
                        .bio(seed.bio())
                        .channelDescription(seed.bio())
                        .isPublic(true)
                        .build());

    profile.updateChannelProfile(seed.bio(), seed.profileImage(), null, null);
    profile.updateChannelInfo(seed.name(), seed.bio());
    userProfileRepository.save(profile);
  }

  private MentoringPost ensurePost(PostSeed seed) {
    User mentor = ensureMentor(seed.mentor());
    MentoringPost post =
        mentoringPostRepository
            .findByTitleAndIsDeletedFalse(seed.title())
            .orElseGet(
                () ->
                    MentoringPost.builder()
                        .mentor(mentor)
                        .title(seed.title())
                        .content(seed.content())
                        .requiredStacks(String.join(", ", seed.stacks()))
                        .category(seed.category())
                        .mentoringType(seed.mentoringType())
                        .durationWeeks(seed.durationWeeks())
                        .curriculum(String.join("\n", seed.curriculum()))
                        .deadlineAt(seed.deadlineAt())
                        .currentParticipants(seed.currentParticipants())
                        .maxParticipants(seed.maxParticipants())
                        .build());

    post.update(
        seed.title(), seed.content(), String.join(", ", seed.stacks()), seed.maxParticipants());
    post.updateHubFields(
        seed.category(),
        seed.mentoringType(),
        seed.durationWeeks(),
        String.join("\n", seed.curriculum()),
        seed.deadlineAt(),
        seed.currentParticipants());

    if (seed.closed()) {
      post.close();
    } else {
      post.reopen();
    }

    mentoringPostRepository.save(post);
    return post;
  }

  private List<PostSeed> mentoringSeeds() {
    MentorSeed backendMentor =
        new MentorSeed(
            "mentor.backend@devpath.com",
            "김도윤",
            "대용량 트래픽과 결제 도메인을 다뤄 온 백엔드 리드입니다.",
            "https://api.dicebear.com/7.x/avataaars/svg?seed=mentor-backend");
    MentorSeed frontendMentor =
        new MentorSeed(
            "mentor.frontend@devpath.com",
            "이서연",
            "프로덕트 UI와 Next.js 성능 최적화를 함께 보는 프론트엔드 멘토입니다.",
            "https://api.dicebear.com/7.x/avataaars/svg?seed=mentor-frontend");
    MentorSeed dataMentor =
        new MentorSeed(
            "mentor.data@devpath.com",
            "박지민",
            "추천 시스템과 데이터 파이프라인을 실무 기준으로 리뷰합니다.",
            "https://api.dicebear.com/7.x/avataaars/svg?seed=mentor-data");
    MentorSeed mobileMentor =
        new MentorSeed(
            "mentor.mobile@devpath.com",
            "한유라",
            "React Native와 출시 품질 관리 경험이 많은 모바일 멘토입니다.",
            "https://api.dicebear.com/7.x/avataaars/svg?seed=mentor-mobile");
    MentorSeed devopsMentor =
        new MentorSeed(
            "mentor.devops@devpath.com",
            "강현우",
            "AWS, Kubernetes, 관측성 설계를 팀 단위로 코칭합니다.",
            "https://api.dicebear.com/7.x/avataaars/svg?seed=mentor-devops");
    MentorSeed productMentor =
        new MentorSeed(
            "mentor.product@devpath.com",
            "최민서",
            "기획, 지표, 협업 문서를 결과물 중심으로 다듬는 PM 멘토입니다.",
            "https://api.dicebear.com/7.x/avataaars/svg?seed=mentor-product");

    return List.of(
        new PostSeed(
            backendMentor,
            "대용량 이커머스 주문 서버 멘토링",
            "실제 운영 환경과 유사한 주문, 재고, 쿠폰 시나리오를 구현하며 백엔드 구조를 점검합니다.",
            "Backend",
            "study",
            List.of("Spring Boot", "Redis", "Kafka", "PostgreSQL"),
            List.of(
                "요구사항 분석과 ERD 설계",
                "주문, 결제, 재고 핵심 API 구현",
                "Redis와 Kafka를 활용한 트래픽 분산",
                "부하 테스트와 병목 지점 리팩터링"),
            LocalDate.now().plusDays(14),
            4,
            5,
            10,
            false),
        new PostSeed(
            frontendMentor,
            "Next.js 블로그 플랫폼 팀 프로젝트",
            "기획부터 배포까지 하나의 블로그 플랫폼을 완성하며 App Router와 SEO를 실습합니다.",
            "Frontend",
            "team",
            List.of("React", "Next.js", "TypeScript", "Tailwind"),
            List.of(
                "App Router 구조와 라우팅 설계",
                "마크다운 에디터와 게시글 상세 구현",
                "디자인 시스템과 다크 모드 적용",
                "Vercel 배포와 성능 측정"),
            LocalDate.now().plusDays(3),
            4,
            3,
            4,
            false),
        new PostSeed(
            dataMentor,
            "추천 시스템 데이터 파이프라인",
            "사용자 로그를 수집하고 추천 API까지 연결하는 과정을 데이터 관점에서 멘토링합니다.",
            "AI",
            "study",
            List.of("Python", "FastAPI", "Scikit-learn", "Docker"),
            List.of(
                "로그 수집 스키마와 저장 전략",
                "추천 후보군 생성과 모델 실험",
                "FastAPI 기반 추천 API 구현",
                "Docker 배포와 간단한 모니터링"),
            LocalDate.now().plusDays(20),
            5,
            2,
            6,
            false),
        new PostSeed(
            mobileMentor,
            "React Native 출시형 사이드 프로젝트",
            "앱스토어 등록을 목표로 화면, 인증, 푸시, QA 체크리스트까지 같이 완성합니다.",
            "App",
            "team",
            List.of("React Native", "Expo", "Firebase"),
            List.of(
                "아이디어 스코프와 와이어프레임 정리",
                "Expo 기반 핵심 화면 구현",
                "Firebase Auth와 Push 연동",
                "QA와 스토어 제출 준비"),
            LocalDate.now().plusDays(9),
            5,
            4,
            5,
            false),
        new PostSeed(
            devopsMentor,
            "AWS와 Kubernetes 무중단 배포 실습",
            "EKS, GitHub Actions, 모니터링 대시보드를 팀 단위로 구성합니다.",
            "DevOps",
            "team",
            List.of("AWS", "Kubernetes", "GitHub Actions", "Grafana"),
            List.of(
                "EKS 클러스터와 네트워크 기본 구성",
                "Deployment, Service, Ingress 설정",
                "CI/CD 파이프라인 자동화",
                "Prometheus와 Grafana 대시보드 구성"),
            LocalDate.now().plusDays(7),
            6,
            3,
            6,
            false),
        new PostSeed(
            productMentor,
            "PM 포트폴리오용 문제 정의 스터디",
            "문제 정의, 사용자 인터뷰, 지표 설계 문서를 한 번에 포트폴리오로 정리합니다.",
            "PM",
            "study",
            List.of("Product", "UX Research", "Metrics"),
            List.of("문제 정의와 가설 정리", "사용자 인터뷰 질문지 리뷰", "핵심 지표와 실험 설계", "포트폴리오 문서 피드백"),
            LocalDate.now().plusDays(12),
            3,
            6,
            8,
            false),
        new PostSeed(
            frontendMentor,
            "디자인 시스템 접근성 리디자인",
            "기존 컴포넌트를 접근성 기준으로 점검하고 재사용 가능한 UI 문서로 정리합니다.",
            "Design",
            "team",
            List.of("Design System", "Accessibility", "Storybook"),
            List.of("컴포넌트 인벤토리 작성", "키보드 탐색과 명도 대비 점검", "Storybook 문서화", "접근성 리포트 작성"),
            LocalDate.now().minusDays(1),
            4,
            5,
            5,
            true));
  }

  private record MentorSeed(String email, String name, String bio, String profileImage) {}

  private record PostSeed(
      MentorSeed mentor,
      String title,
      String content,
      String category,
      String mentoringType,
      List<String> stacks,
      List<String> curriculum,
      LocalDate deadlineAt,
      Integer durationWeeks,
      Integer currentParticipants,
      Integer maxParticipants,
      boolean closed) {}
}
