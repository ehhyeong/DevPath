package com.devpath.api.learner.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devpath.api.common.dto.CourseDetailResponse;
import com.devpath.api.common.dto.CourseListItemResponse;
import com.devpath.api.learner.dto.SkillCheckDto;
import com.devpath.api.roadmap.service.CustomRoadmapCopyService;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseAnnouncement;
import com.devpath.domain.course.entity.CourseAnnouncementType;
import com.devpath.domain.course.entity.CourseDifficultyLevel;
import com.devpath.domain.course.entity.CourseMaterial;
import com.devpath.domain.course.entity.CourseObjective;
import com.devpath.domain.course.entity.CourseSection;
import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.entity.CourseTagMap;
import com.devpath.domain.course.entity.CourseTargetAudience;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.entity.LessonType;
import com.devpath.domain.course.repository.CourseAnnouncementRepository;
import com.devpath.domain.course.repository.CourseMaterialRepository;
import com.devpath.domain.course.repository.CourseObjectiveRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseSectionRepository;
import com.devpath.domain.course.repository.CourseTagMapRepository;
import com.devpath.domain.course.repository.CourseTargetAudienceRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.NodeRecommendation;
import com.devpath.domain.roadmap.entity.Prerequisite;
import com.devpath.domain.roadmap.entity.RecommendationStatus;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.port.JpaOfficialRoadmapReader;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import com.devpath.domain.roadmap.repository.NodeRecommendationRepository;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.PrerequisiteRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.roadmap.service.TagValidationService;
import com.devpath.domain.user.entity.Tag;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.entity.UserTechStack;
import com.devpath.domain.user.repository.TagRepository;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;

@DataJpaTest(
        properties = {
                "spring.jpa.hibernate.ddl-auto=create-drop",
                "spring.sql.init.mode=never",
                "spring.jpa.defer-datasource-initialization=false"
        })
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Import({
        LearnerCourseService.class,
        CourseWishlistService.class,
        CourseEnrollmentService.class,
        SkillCheckService.class,
        NodeRecommendationService.class,
        CustomRoadmapCopyService.class,
        JpaOfficialRoadmapReader.class,
        TagValidationService.class
})
class LearnerFlowIntegrationTest {

    @Autowired private LearnerCourseService learnerCourseService;
    @Autowired private CourseWishlistService courseWishlistService;
    @Autowired private CourseEnrollmentService courseEnrollmentService;
    @Autowired private SkillCheckService skillCheckService;
    @Autowired private NodeRecommendationService nodeRecommendationService;
    @Autowired private CustomRoadmapCopyService customRoadmapCopyService;

    @Autowired private UserRepository userRepository;
    @Autowired private UserProfileRepository userProfileRepository;
    @Autowired private TagRepository tagRepository;
    @Autowired private UserTechStackRepository userTechStackRepository;

    @Autowired private CourseRepository courseRepository;
    @Autowired private CourseObjectiveRepository courseObjectiveRepository;
    @Autowired private CourseTargetAudienceRepository courseTargetAudienceRepository;
    @Autowired private CourseTagMapRepository courseTagMapRepository;
    @Autowired private CourseSectionRepository courseSectionRepository;
    @Autowired private LessonRepository lessonRepository;
    @Autowired private CourseMaterialRepository courseMaterialRepository;
    @Autowired private CourseAnnouncementRepository courseAnnouncementRepository;

    @Autowired private RoadmapRepository roadmapRepository;
    @Autowired private RoadmapNodeRepository roadmapNodeRepository;
    @Autowired private NodeRequiredTagRepository nodeRequiredTagRepository;
    @Autowired private PrerequisiteRepository prerequisiteRepository;
    @Autowired private CustomRoadmapRepository customRoadmapRepository;
    @Autowired private CustomRoadmapNodeRepository customRoadmapNodeRepository;
    @Autowired private NodeRecommendationRepository nodeRecommendationRepository;

    @Autowired private EntityManager entityManager;

    private User instructor;
    private User learner;
    private User otherLearner;
    private Tag javaTag;
    private Tag springTag;
    private Tag dockerTag;
    private Course publishedCourse;
    private Course draftCourse;
    private Roadmap roadmap;
    private RoadmapNode javaNode;
    private RoadmapNode springNode;
    private RoadmapNode dockerNode;

    @BeforeEach
    void setUp() {
        instructor = userRepository.save(
                User.builder()
                        .email("instructor@devpath.com")
                        .password("encoded")
                        .name("백엔드 강사")
                        .role(UserRole.ROLE_INSTRUCTOR)
                        .build()
        );
        learner = userRepository.save(
                User.builder()
                        .email("learner@devpath.com")
                        .password("encoded")
                        .name("학습자")
                        .role(UserRole.ROLE_LEARNER)
                        .build()
        );
        otherLearner = userRepository.save(
                User.builder()
                        .email("other-learner@devpath.com")
                        .password("encoded")
                        .name("다른 학습자")
                        .role(UserRole.ROLE_LEARNER)
                        .build()
        );

        userProfileRepository.save(
                UserProfile.builder()
                        .user(instructor)
                        .channelName("백엔드 연구소")
                        .bio("Spring과 보안을 다루는 강사입니다.")
                        .profileImage("/profiles/instructor.png")
                        .isPublic(true)
                        .build()
        );

        javaTag = tagRepository.save(Tag.builder().name("Java").category("Backend").isOfficial(true).build());
        springTag = tagRepository.save(Tag.builder().name("Spring").category("Backend").isOfficial(true).build());
        dockerTag = tagRepository.save(Tag.builder().name("Docker").category("DevOps").isOfficial(true).build());

        userTechStackRepository.save(UserTechStack.builder().user(learner).tag(javaTag).build());

        publishedCourse = createCourse("Spring Security 완전 정복", CourseStatus.PUBLISHED);
        draftCourse = createCourse("비공개 초안 강의", CourseStatus.DRAFT);

        courseObjectiveRepository.save(
                CourseObjective.builder()
                        .course(publishedCourse)
                        .objectiveText("보안 필터 체인을 이해한다.")
                        .displayOrder(0)
                        .build()
        );
        courseTargetAudienceRepository.save(
                CourseTargetAudience.builder()
                        .course(publishedCourse)
                        .audienceDescription("Spring 백엔드 입문자")
                        .displayOrder(0)
                        .build()
        );
        courseTagMapRepository.save(CourseTagMap.builder().course(publishedCourse).tag(javaTag).proficiencyLevel(3).build());
        courseTagMapRepository.save(CourseTagMap.builder().course(publishedCourse).tag(springTag).proficiencyLevel(2).build());

        CourseSection section = courseSectionRepository.save(
                CourseSection.builder()
                        .course(publishedCourse)
                        .title("섹션 1")
                        .description("보안 기초")
                        .orderIndex(1)
                        .isPublished(true)
                        .build()
        );
        Lesson lesson = lessonRepository.save(
                Lesson.builder()
                        .section(section)
                        .title("JWT 인증")
                        .description("JWT 인증 흐름")
                        .lessonType(LessonType.VIDEO)
                        .videoUrl("https://cdn.devpath.com/lesson.mp4")
                        .videoId("lesson-asset")
                        .thumbnailUrl("https://cdn.devpath.com/lesson.png")
                        .durationSeconds(600)
                        .isPreview(true)
                        .isPublished(true)
                        .orderIndex(1)
                        .build()
        );
        courseMaterialRepository.save(
                CourseMaterial.builder()
                        .lesson(lesson)
                        .materialType("SLIDE")
                        .materialUrl("https://cdn.devpath.com/lesson.pdf")
                        .assetKey("lesson.pdf")
                        .originalFileName("lesson.pdf")
                        .displayOrder(0)
                        .build()
        );

        LocalDateTime now = LocalDateTime.now();
        courseAnnouncementRepository.save(
                CourseAnnouncement.builder()
                        .course(publishedCourse)
                        .type(CourseAnnouncementType.EVENT)
                        .title("오프라인 특강 안내")
                        .content("오프라인 특강이 열립니다.")
                        .pinned(true)
                        .displayOrder(0)
                        .publishedAt(now.minusDays(1))
                        .exposureStartAt(now.minusDays(1))
                        .exposureEndAt(now.plusDays(7))
                        .eventBannerText("보안 특강")
                        .eventLink("https://devpath.com/events/security")
                        .build()
        );
        courseAnnouncementRepository.save(
                CourseAnnouncement.builder()
                        .course(publishedCourse)
                        .type(CourseAnnouncementType.NORMAL)
                        .title("강의 자료 업데이트")
                        .content("최신 자료로 교체되었습니다.")
                        .pinned(false)
                        .displayOrder(1)
                        .publishedAt(now.minusHours(1))
                        .build()
        );

        courseWishlistService.addToWishlist(learner.getId(), publishedCourse.getCourseId());
        courseEnrollmentService.enroll(learner.getId(), publishedCourse.getCourseId());

        roadmap = roadmapRepository.save(
                Roadmap.builder()
                        .title("백엔드 학습 로드맵")
                        .description("태그 기반 추천용 로드맵")
                        .creator(instructor)
                        .isOfficial(true)
                        .isPublic(true)
                        .isDeleted(false)
                        .build()
        );
        javaNode = roadmapNodeRepository.save(
                RoadmapNode.builder()
                        .roadmap(roadmap)
                        .title("Java 기본")
                        .content("Java 기초")
                        .nodeType("CONCEPT")
                        .sortOrder(1)
                        .build()
        );
        springNode = roadmapNodeRepository.save(
                RoadmapNode.builder()
                        .roadmap(roadmap)
                        .title("Spring 핵심")
                        .content("Spring 기본기")
                        .nodeType("PRACTICE")
                        .sortOrder(2)
                        .build()
        );
        dockerNode = roadmapNodeRepository.save(
                RoadmapNode.builder()
                        .roadmap(roadmap)
                        .title("Docker 배포")
                        .content("Docker 실습")
                        .nodeType("PRACTICE")
                        .sortOrder(3)
                        .build()
        );

        nodeRequiredTagRepository.save(com.devpath.domain.roadmap.entity.NodeRequiredTag.builder().node(javaNode).tag(javaTag).build());
        nodeRequiredTagRepository.save(com.devpath.domain.roadmap.entity.NodeRequiredTag.builder().node(springNode).tag(javaTag).build());
        nodeRequiredTagRepository.save(com.devpath.domain.roadmap.entity.NodeRequiredTag.builder().node(springNode).tag(springTag).build());
        nodeRequiredTagRepository.save(com.devpath.domain.roadmap.entity.NodeRequiredTag.builder().node(dockerNode).tag(dockerTag).build());

        prerequisiteRepository.save(Prerequisite.builder().node(springNode).preNode(javaNode).build());
        prerequisiteRepository.save(Prerequisite.builder().node(dockerNode).preNode(springNode).build());

        flushAndClear();
    }

    @Test
    @DisplayName("학습자 강의 목록과 상세는 공개 강의만 내려주고 찜과 수강 여부를 반영한다")
    void learnerCourseListAndDetailUsesPublishedData() {
        List<CourseListItemResponse> anonymousList = learnerCourseService.getCourseList(null);
        assertThat(anonymousList).hasSize(1);
        assertThat(anonymousList.get(0).getCourseId()).isEqualTo(publishedCourse.getCourseId());
        assertThat(anonymousList.get(0).getIsBookmarked()).isFalse();
        assertThat(anonymousList.get(0).getIsEnrolled()).isFalse();

        List<CourseListItemResponse> learnerList = learnerCourseService.getCourseList(learner.getId());
        assertThat(learnerList).hasSize(1);
        assertThat(learnerList.get(0).getTags()).containsExactly("Java", "Spring");
        assertThat(learnerList.get(0).getInstructorChannelName()).isEqualTo("백엔드 연구소");
        assertThat(learnerList.get(0).getIsBookmarked()).isTrue();
        assertThat(learnerList.get(0).getIsEnrolled()).isTrue();

        CourseDetailResponse detail =
                learnerCourseService.getCourseDetail(learner.getId(), publishedCourse.getCourseId());

        assertThat(detail.getCourseId()).isEqualTo(publishedCourse.getCourseId());
        assertThat(detail.getObjectives()).hasSize(1);
        assertThat(detail.getTargetAudiences()).hasSize(1);
        assertThat(detail.getTags()).extracting(CourseDetailResponse.TagItem::getTagName)
                .containsExactlyInAnyOrder("Java", "Spring");
        assertThat(detail.getSections()).hasSize(1);
        assertThat(detail.getSections().get(0).getLessons()).hasSize(1);
        assertThat(detail.getInstructor()).isNotNull();
        assertThat(detail.getInstructor().getChannelName()).isEqualTo("백엔드 연구소");
        assertThat(detail.getInstructor().getChannelApiPath())
                .isEqualTo("/api/instructors/" + instructor.getId() + "/channel");
        assertThat(detail.getNews()).hasSize(2);
        assertThat(detail.getNews()).extracting(CourseDetailResponse.NewsItem::getTitle)
                .contains("오프라인 특강 안내", "강의 자료 업데이트");
        assertThat(detail.getNews()).extracting(CourseDetailResponse.NewsItem::getUrl)
                .contains("https://devpath.com/events/security", "/api/courses/" + publishedCourse.getCourseId() + "/news");
    }

    @Test
    @DisplayName("학습자 강의 상세는 비공개 강의를 차단한다")
    void learnerCourseDetailRejectsDraftCourse() {
        assertThatThrownBy(() -> learnerCourseService.getCourseDetail(learner.getId(), draftCourse.getCourseId()))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.COURSE_NOT_FOUND);
    }

    @Test
    @DisplayName("로드맵 잠금 상태는 선행 노드 완료 여부를 기준으로 계산한다")
    void roadmapLockStatusUsesCustomRoadmapProgress() {
        customRoadmapCopyService.copyToCustomRoadmap(learner.getId(), roadmap.getRoadmapId());
        flushAndClear();

        SkillCheckDto.RoadmapLockStatusResponse response =
                skillCheckService.getRoadmapLockStatus(learner.getId(), roadmap.getRoadmapId());

        assertThat(response.getTotalNodes()).isEqualTo(3);
        assertThat(response.getUnlockedNodes()).isEqualTo(2);
        assertThat(response.getNodeLockStatus())
                .extracting(SkillCheckDto.NodeLockStatusResponse::getIsLocked)
                .containsExactly(false, false, true);
        assertThat(skillCheckService.checkNodeLockStatus(learner.getId(), springNode.getNodeId())).isTrue();
        assertThat(skillCheckService.checkNodeLockStatus(learner.getId(), dockerNode.getNodeId())).isFalse();
    }

    @Test
    @DisplayName("추천 생성과 수락 거절 만료는 사용자 기준으로 처리되고 수락 시 커스텀 로드맵에 반영된다")
    void recommendationFlowUsesAuthenticatedUserAndPersistsCustomRoadmap() {
        List<NodeRecommendation> firstRecommendations =
                nodeRecommendationService.generateRecommendations(learner.getId(), roadmap.getRoadmapId());

        assertThat(firstRecommendations).hasSize(2);
        NodeRecommendation firstRemedial = firstRecommendations.stream()
                .filter(recommendation -> recommendation.getRecommendationType() == NodeRecommendation.RecommendationType.REMEDIAL)
                .findFirst()
                .orElseThrow();
        NodeRecommendation firstAdvanced = firstRecommendations.stream()
                .filter(recommendation -> recommendation.getRecommendationType() == NodeRecommendation.RecommendationType.ADVANCED)
                .findFirst()
                .orElseThrow();

        assertThat(firstRemedial.getRecommendedNode().getNodeId()).isEqualTo(springNode.getNodeId());
        assertThat(firstAdvanced.getRecommendedNode().getNodeId()).isEqualTo(javaNode.getNodeId());

        nodeRecommendationService.rejectRecommendation(learner.getId(), firstAdvanced.getRecommendationId());
        flushAndClear();

        assertThat(nodeRecommendationRepository.findById(firstAdvanced.getRecommendationId()))
                .hasValueSatisfying(recommendation -> assertThat(recommendation.getStatus()).isEqualTo(RecommendationStatus.REJECTED));

        List<NodeRecommendation> secondRecommendations =
                nodeRecommendationService.generateRecommendations(learner.getId(), roadmap.getRoadmapId());

        NodeRecommendation secondRemedial = secondRecommendations.stream()
                .filter(recommendation -> recommendation.getRecommendationType() == NodeRecommendation.RecommendationType.REMEDIAL)
                .findFirst()
                .orElseThrow();
        NodeRecommendation secondAdvanced = secondRecommendations.stream()
                .filter(recommendation -> recommendation.getRecommendationType() == NodeRecommendation.RecommendationType.ADVANCED)
                .findFirst()
                .orElseThrow();

        assertThatThrownBy(() -> nodeRecommendationService.acceptRecommendation(otherLearner.getId(), secondRemedial.getRecommendationId()))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.RECOMMENDATION_NOT_FOUND);

        nodeRecommendationService.acceptRecommendation(learner.getId(), secondRemedial.getRecommendationId());
        nodeRecommendationService.expireRecommendation(learner.getId(), secondAdvanced.getRecommendationId());
        flushAndClear();

        CustomRoadmap customRoadmap = customRoadmapRepository
                .findByUserIdAndOriginalRoadmapRoadmapId(learner.getId(), roadmap.getRoadmapId())
                .orElseThrow();

        assertThat(customRoadmapNodeRepository.findByCustomRoadmapAndOriginalNode(customRoadmap, springNode)).isPresent();
        assertThat(nodeRecommendationRepository.findById(secondRemedial.getRecommendationId()))
                .hasValueSatisfying(recommendation -> assertThat(recommendation.getStatus()).isEqualTo(RecommendationStatus.ACCEPTED));
        assertThat(nodeRecommendationRepository.findById(secondAdvanced.getRecommendationId()))
                .hasValueSatisfying(recommendation -> assertThat(recommendation.getStatus()).isEqualTo(RecommendationStatus.EXPIRED));
    }

    private Course createCourse(String title, CourseStatus status) {
        return courseRepository.save(
                Course.builder()
                        .instructor(instructor)
                        .title(title)
                        .subtitle(title + " 부제")
                        .description(title + " 설명")
                        .price(new BigDecimal("79000"))
                        .originalPrice(new BigDecimal("99000"))
                        .currency("KRW")
                        .difficultyLevel(CourseDifficultyLevel.INTERMEDIATE)
                        .language("ko")
                        .hasCertificate(true)
                        .status(status)
                        .publishedAt(status == CourseStatus.PUBLISHED ? LocalDateTime.now().minusDays(2) : null)
                        .thumbnailUrl("https://cdn.devpath.com/course.png")
                        .introVideoUrl("https://cdn.devpath.com/intro.mp4")
                        .videoAssetKey("intro-asset")
                        .durationSeconds(120)
                        .prerequisites(List.of("Java 기본"))
                        .jobRelevance(List.of("백엔드 개발자"))
                        .build()
        );
    }

    private void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
    }
}
