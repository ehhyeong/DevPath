package com.devpath.api.home.service;

import com.devpath.api.home.dto.PublicHomeDto;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.project.entity.Project;
import com.devpath.domain.project.repository.ProjectRepository;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.study.entity.StudyGroup;
import com.devpath.domain.study.repository.StudyGroupRepository;
import com.devpath.domain.user.entity.Tag;
import com.devpath.domain.user.repository.TagRepository;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PublicHomeService {

  private final RoadmapRepository roadmapRepository;
  private final CourseRepository courseRepository;
  private final ProjectRepository projectRepository;
  private final StudyGroupRepository studyGroupRepository;
  private final TagRepository tagRepository;

  public PublicHomeDto.OverviewResponse getOverview() {
    List<Roadmap> officialRoadmaps = roadmapRepository.findAllByIsOfficialTrueAndIsDeletedFalse().stream()
        .sorted(Comparator.comparing(Roadmap::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
        .toList();
    List<Course> featuredCourses =
        courseRepository.findTop3ByStatusOrderByPublishedAtDescCourseIdDesc(CourseStatus.PUBLISHED);
    List<Project> featuredProjects = projectRepository.findTop3ByIsDeletedFalseOrderByCreatedAtDesc();
    List<StudyGroup> featuredStudyGroups =
        studyGroupRepository.findTop3ByIsDeletedFalseOrderByCreatedAtDesc();

    return PublicHomeDto.OverviewResponse.builder()
        .badge("개발자 커리어 가속화 플랫폼")
        .title("막막한 공부를 실행 가능한 성장 경로로 바꾸는 DevPath")
        .description("AI 진단, 맞춤형 로드맵, 실전 프로젝트, 학습 커뮤니티까지 하나의 흐름으로 연결합니다.")
        .actions(buildActions())
        .metrics(buildMetrics(officialRoadmaps.size()))
        .trendingSkills(resolveTrendingSkills())
        .featuredRoadmaps(buildRoadmapPreviews(officialRoadmaps))
        .featuredCourses(buildCoursePreviews(featuredCourses))
        .featuredProjects(buildProjectPreviews(featuredProjects))
        .featuredStudyGroups(buildStudyGroupPreviews(featuredStudyGroups))
        .journeySteps(buildJourneySteps())
        .build();
  }

  private List<PublicHomeDto.ActionLink> buildActions() {
    return List.of(
        PublicHomeDto.ActionLink.builder()
            .label("로드맵 시작하기")
            .href("#learn")
            .tone("primary")
            .build(),
        PublicHomeDto.ActionLink.builder()
            .label("프로젝트 둘러보기")
            .href("#build")
            .tone("secondary")
            .build());
  }

  private List<PublicHomeDto.MetricCard> buildMetrics(int roadmapCount) {
    return List.of(
        metric("공개 로드맵", formatCount(roadmapCount), "기초부터 실전까지 이어지는 학습 경로"),
        metric(
            "출시 강의",
            formatCount(courseRepository.countByStatus(CourseStatus.PUBLISHED)),
            "바로 수강 가능한 공개 강의"),
        metric("실전 프로젝트", formatCount(projectRepository.countByIsDeletedFalse()), "협업과 포트폴리오를 위한 프로젝트"),
        metric("스터디 그룹", formatCount(studyGroupRepository.countByIsDeletedFalse()), "함께 학습하는 커뮤니티 그룹"));
  }

  private PublicHomeDto.MetricCard metric(String label, String value, String description) {
    return PublicHomeDto.MetricCard.builder()
        .label(label)
        .value(value)
        .description(description)
        .build();
  }

  private List<String> resolveTrendingSkills() {
    List<String> skillNames = tagRepository.findTop6ByIsOfficialTrueAndIsDeletedFalseOrderByTagIdAsc()
        .stream()
        .map(Tag::getName)
        .filter(name -> name != null && !name.isBlank())
        .toList();

    if (!skillNames.isEmpty()) {
      return skillNames;
    }

    return List.of("Spring Boot", "React", "TypeScript", "Docker", "PostgreSQL", "AWS");
  }

  private List<PublicHomeDto.ContentPreview> buildRoadmapPreviews(List<Roadmap> roadmaps) {
    List<PublicHomeDto.ContentPreview> previews = roadmaps.stream()
        .limit(3)
        .map(roadmap -> preview(
            roadmap.getRoadmapId(),
            "로드맵",
            roadmap.getTitle(),
            defaultIfBlank(roadmap.getDescription(), "기초부터 실무까지 이어지는 공식 학습 경로입니다."),
            "/roadmaps/" + roadmap.getRoadmapId()))
        .toList();

    if (!previews.isEmpty()) {
      return previews;
    }

    return List.of(
        preview(null, "로드맵", "Backend Engineer Path", "Java, Spring, 데이터베이스, 배포까지 단계적으로 학습합니다.", "#learn"),
        preview(null, "로드맵", "Frontend Engineer Path", "TypeScript, React, 상태관리, 테스트 흐름으로 확장합니다.", "#learn"),
        preview(null, "로드맵", "DevOps Path", "Docker, CI/CD, 인프라 운영 감각을 빠르게 익힙니다.", "#learn"));
  }

  private List<PublicHomeDto.ContentPreview> buildCoursePreviews(List<Course> courses) {
    if (!courses.isEmpty()) {
      return courses.stream()
          .map(course -> preview(
              course.getCourseId(),
              "강의",
              course.getTitle(),
              defaultIfBlank(course.getSubtitle(), defaultIfBlank(course.getDescription(), "실무 중심 커리큘럼으로 연결되는 강의입니다.")),
              "/courses/" + course.getCourseId()))
          .toList();
    }

    return List.of(
        preview(null, "강의", "Spring Boot API 설계", "인증, 예외 처리, 데이터 접근 계층까지 한 번에 정리합니다.", "#learn"),
        preview(null, "강의", "React UI 구현", "컴포넌트 설계와 API 연동 패턴을 실전 예제로 익힙니다.", "#learn"),
        preview(null, "강의", "Docker 배포 기초", "개발 환경부터 배포 파이프라인 연결까지 빠르게 잡습니다.", "#learn"));
  }

  private List<PublicHomeDto.ContentPreview> buildProjectPreviews(List<Project> projects) {
    if (!projects.isEmpty()) {
      return projects.stream()
          .map(project -> preview(
              project.getId(),
              "프로젝트",
              project.getName(),
              defaultIfBlank(project.getDescription(), "실전 협업 경험을 쌓을 수 있는 프로젝트입니다."),
              "/projects/" + project.getId()))
          .toList();
    }

    return List.of(
        preview(null, "프로젝트", "팀 대시보드 구축", "프런트엔드와 백엔드를 함께 연결하며 실전 협업을 연습합니다.", "#build"),
        preview(null, "프로젝트", "추천 시스템 실험", "데이터 기반 기능을 설계하고 검증하는 흐름을 경험합니다.", "#build"),
        preview(null, "프로젝트", "실시간 커뮤니티 서비스", "웹소켓, 알림, 운영 이슈를 함께 다뤄봅니다.", "#build"));
  }

  private List<PublicHomeDto.ContentPreview> buildStudyGroupPreviews(List<StudyGroup> studyGroups) {
    if (!studyGroups.isEmpty()) {
      return studyGroups.stream()
          .map(studyGroup -> preview(
              studyGroup.getId(),
              "스터디",
              studyGroup.getName(),
              defaultIfBlank(studyGroup.getDescription(), "같이 성장할 팀을 찾는 학습 그룹입니다."),
              "/study-groups/" + studyGroup.getId()))
          .toList();
    }

    return List.of(
        preview(null, "스터디", "CS 면접 대비", "운영체제, 네트워크, 데이터베이스를 주 단위로 복습합니다.", "#build"),
        preview(null, "스터디", "알고리즘 루틴", "매일 문제 풀이와 코드 리뷰를 반복하는 그룹입니다.", "#build"),
        preview(null, "스터디", "포트폴리오 리뷰", "서로의 프로젝트와 이력서를 다듬는 실전 준비 모임입니다.", "#build"));
  }

  private List<PublicHomeDto.JourneyStep> buildJourneySteps() {
    return List.of(
        step("01", "Learn", "AI 진단과 로드맵으로 학습 방향을 잡습니다.", "현재 실력과 목표를 기준으로 필요한 주제를 빠르게 정리합니다.", "로드맵 보러가기", "#learn"),
        step("02", "Build", "강의와 프로젝트로 배운 내용을 결과물로 바꿉니다.", "실전 과제와 협업 경험을 통해 포트폴리오를 쌓는 단계입니다.", "프로젝트 살펴보기", "#build"),
        step("03", "Career", "누적된 학습 기록으로 다음 기회를 연결합니다.", "성장 데이터, 산출물, 커뮤니티 활동을 바탕으로 커리어를 확장합니다.", "성장 흐름 확인하기", "#career"));
  }

  private PublicHomeDto.JourneyStep step(
      String step,
      String eyebrow,
      String title,
      String description,
      String ctaLabel,
      String href) {
    return PublicHomeDto.JourneyStep.builder()
        .step(step)
        .eyebrow(eyebrow)
        .title(title)
        .description(description)
        .ctaLabel(ctaLabel)
        .href(href)
        .build();
  }

  private PublicHomeDto.ContentPreview preview(
      Long id,
      String badge,
      String title,
      String description,
      String href) {
    return PublicHomeDto.ContentPreview.builder()
        .id(id)
        .badge(badge)
        .title(title)
        .description(description)
        .href(href)
        .build();
  }

  private String formatCount(long count) {
    return Long.toString(count);
  }

  private String defaultIfBlank(String value, String defaultValue) {
    if (value == null || value.isBlank()) {
      return defaultValue;
    }
    return value;
  }
}
