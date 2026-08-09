package com.devpath.api.instructor.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.devpath.api.instructor.dto.mentoring.InstructorMentoringBoardPayload;
import com.devpath.domain.mentoring.entity.MentoringApplication;
import com.devpath.domain.mentoring.entity.MentoringApplicationStatus;
import com.devpath.domain.mentoring.entity.MentoringPost;
import com.devpath.domain.mentoring.repository.MentoringApplicationRepository;
import com.devpath.domain.mentoring.repository.MentoringPostRepository;
import com.devpath.domain.user.entity.User;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class InstructorMentoringBoardLiveDataAssemblerTest {

  @Mock private MentoringApplicationRepository mentoringApplicationRepository;
  @Mock private MentoringPostRepository mentoringPostRepository;

  private InstructorMentoringBoardLiveDataAssembler assembler;

  @BeforeEach
  void setUp() {
    assembler =
        new InstructorMentoringBoardLiveDataAssembler(
            mentoringApplicationRepository, mentoringPostRepository);
  }

  @Test
  void attachLiveDataPrependsCurrentPostsAndPendingApplications() {
    long instructorId = 1L;
    User mentor = user(instructorId, "Mentor");
    User applicant = user(2L, "Learner");
    MentoringPost post =
        MentoringPost.builder()
            .mentor(mentor)
            .title("협업 플랫폼")
            .content("팀 프로젝트")
            .requiredStacks("React, Spring Boot")
            .category("Full Stack")
            .mentoringType("team")
            .durationWeeks(2)
            .curriculum("설계\n구현")
            .currentParticipants(1)
            .maxParticipants(4)
            .build();
    ReflectionTestUtils.setField(post, "id", 10L);
    MentoringApplication application =
        MentoringApplication.builder()
            .post(post)
            .applicant(applicant)
            .message("협업 경험을 쌓고 싶습니다.\n포트폴리오: https://example.com/portfolio")
            .desiredPosition("Frontend")
            .build();
    ReflectionTestUtils.setField(application, "id", 20L);

    when(mentoringPostRepository.findAllByMentor_IdAndIsDeletedFalseOrderByCreatedAtDesc(
            instructorId))
        .thenReturn(List.of(post));
    when(mentoringApplicationRepository
            .findAllByPost_Mentor_IdAndStatusAndIsDeletedFalseOrderByCreatedAtDesc(
                instructorId, MentoringApplicationStatus.PENDING))
        .thenReturn(List.of(application));

    InstructorMentoringBoardPayload result =
        assembler.attachLiveData(
            instructorId,
            new InstructorMentoringBoardPayload(
                List.of(project("legacy-project")), List.of(request("legacy-request")), List.of()));

    assertThat(result.projects())
        .extracting(InstructorMentoringBoardPayload.ProjectItem::id)
        .containsExactly("post-10", "legacy-project");
    assertThat(result.projects().getFirst().tags()).containsExactly("React", "Spring Boot");
    assertThat(result.requests())
        .extracting(InstructorMentoringBoardPayload.RequestItem::id)
        .containsExactly("application-20", "legacy-request");
    assertThat(result.requests().getFirst().motivation()).isEqualTo("협업 경험을 쌓고 싶습니다.");
    assertThat(result.requests().getFirst().portfolioUrl())
        .isEqualTo("https://example.com/portfolio");
  }

  @Test
  void filterPersistedLiveDataKeepsOnlyBoardOwnedProjectsAndRequests() {
    InstructorMentoringBoardPayload result =
        assembler.filterPersistedLiveData(
            new InstructorMentoringBoardPayload(
                List.of(project("post-10"), project("legacy-project")),
                List.of(request("application-20"), request("legacy-request")),
                List.of()));

    assertThat(result.projects())
        .extracting(InstructorMentoringBoardPayload.ProjectItem::id)
        .containsExactly("legacy-project");
    assertThat(result.requests())
        .extracting(InstructorMentoringBoardPayload.RequestItem::id)
        .containsExactly("legacy-request");
  }

  private User user(Long id, String name) {
    User user =
        User.builder()
            .email(name.toLowerCase() + id + "@example.com")
            .password("encoded")
            .name(name)
            .build();
    ReflectionTestUtils.setField(user, "id", id);
    return user;
  }

  private InstructorMentoringBoardPayload.ProjectItem project(String id) {
    return new InstructorMentoringBoardPayload.ProjectItem(
        id,
        "title",
        "request title",
        "description",
        "study",
        "Backend",
        "모집중",
        1,
        2,
        List.of(),
        List.of(),
        "mentor",
        "bio",
        "intro",
        4,
        List.of());
  }

  private InstructorMentoringBoardPayload.RequestItem request(String id) {
    return new InstructorMentoringBoardPayload.RequestItem(
        id, "applicant", "seed", "방금 전", "project", "title", "study", "직접 무관", "motivation", "");
  }
}
