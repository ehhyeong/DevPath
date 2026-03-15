package com.devpath.api.course.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devpath.api.course.dto.PublicCourseNewsDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseAnnouncement;
import com.devpath.domain.course.entity.CourseAnnouncementType;
import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.repository.CourseAnnouncementRepository;
import com.devpath.domain.course.repository.CourseRepository;
import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;

// Verifies the public course news tab query path against the JPA model.
@DataJpaTest(
    properties = {
      "spring.jpa.hibernate.ddl-auto=create-drop",
      "spring.sql.init.mode=never",
      "spring.jpa.defer-datasource-initialization=false"
    })
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Import(PublicCourseNewsQueryService.class)
class PublicCourseNewsQueryServiceIntegrationTest {

  @Autowired private PublicCourseNewsQueryService publicCourseNewsQueryService;
  @Autowired private CourseRepository courseRepository;
  @Autowired private CourseAnnouncementRepository courseAnnouncementRepository;
  @Autowired private EntityManager entityManager;

  private Long publishedCourseId;
  private Long draftCourseId;

  @BeforeEach
  void setUp() {
    LocalDateTime now = LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS);

    Course publishedCourse =
        courseRepository.save(
            Course.builder()
                .instructorId(7L)
                .title("Published Security Course")
                .subtitle("Public news tab")
                .status(CourseStatus.PUBLISHED)
                .publishedAt(now.minusDays(3))
                .build());

    Course draftCourse =
        courseRepository.save(
            Course.builder()
                .instructorId(7L)
                .title("Draft Security Course")
                .subtitle("Hidden news tab")
                .status(CourseStatus.DRAFT)
                .build());

    publishedCourseId = publishedCourse.getCourseId();
    draftCourseId = draftCourse.getCourseId();

    courseAnnouncementRepository.save(
        announcement(
            publishedCourse,
            CourseAnnouncementType.EVENT,
            "Pinned visible event",
            true,
            0,
            now.minusHours(2),
            now.minusHours(1),
            now.plusDays(3),
            "Visible event banner",
            "https://devpath.com/events/visible"));

    courseAnnouncementRepository.save(
        announcement(
            publishedCourse,
            CourseAnnouncementType.NORMAL,
            "Visible normal notice",
            false,
            1,
            now.minusHours(3),
            null,
            null,
            null,
            null));

    courseAnnouncementRepository.save(
        announcement(
            publishedCourse,
            CourseAnnouncementType.EVENT,
            "Future publish",
            false,
            2,
            now.plusDays(1),
            now.minusHours(1),
            now.plusDays(2),
            "Future banner",
            "https://devpath.com/events/future-publish"));

    courseAnnouncementRepository.save(
        announcement(
            publishedCourse,
            CourseAnnouncementType.EVENT,
            "Future exposure",
            false,
            3,
            now.minusHours(1),
            now.plusDays(1),
            now.plusDays(2),
            "Future exposure banner",
            "https://devpath.com/events/future-exposure"));

    courseAnnouncementRepository.save(
        announcement(
            publishedCourse,
            CourseAnnouncementType.EVENT,
            "Expired exposure",
            false,
            4,
            now.minusDays(2),
            now.minusDays(2),
            now.minusHours(1),
            "Expired exposure banner",
            "https://devpath.com/events/expired"));

    courseAnnouncementRepository.save(
        announcement(
            draftCourse,
            CourseAnnouncementType.NORMAL,
            "Draft course announcement",
            true,
            0,
            now.minusHours(1),
            null,
            null,
            null,
            null));

    flushAndClear();
  }

  @Test
  @DisplayName("공개 강의 새소식 탭은 현재 시점에 노출 가능한 공지만 정렬해서 반환한다")
  void getCourseNewsReturnsVisibleAnnouncements() {
    List<PublicCourseNewsDto.NewsItemResponse> response =
        publicCourseNewsQueryService.getCourseNews(publishedCourseId);

    assertThat(response).hasSize(2);
    assertThat(response)
        .extracting(PublicCourseNewsDto.NewsItemResponse::getTitle)
        .containsExactly("Pinned visible event", "Visible normal notice");
    assertThat(response.get(0).getType()).isEqualTo("EVENT");
    assertThat(response.get(0).getPinned()).isTrue();
    assertThat(response.get(0).getEventBannerText()).isEqualTo("Visible event banner");
    assertThat(response.get(0).getEventLink()).isEqualTo("https://devpath.com/events/visible");
    assertThat(response.get(1).getType()).isEqualTo("NORMAL");
    assertThat(response.get(1).getEventBannerText()).isNull();
  }

  @Test
  @DisplayName("공개되지 않은 강의는 새소식 탭을 조회할 수 없다")
  void getCourseNewsRejectsNonPublishedCourse() {
    assertThatThrownBy(() -> publicCourseNewsQueryService.getCourseNews(draftCourseId))
        .isInstanceOf(CustomException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
  }

  private CourseAnnouncement announcement(
      Course course,
      CourseAnnouncementType type,
      String title,
      boolean pinned,
      int displayOrder,
      LocalDateTime publishedAt,
      LocalDateTime exposureStartAt,
      LocalDateTime exposureEndAt,
      String eventBannerText,
      String eventLink) {
    return CourseAnnouncement.builder()
        .course(course)
        .type(type)
        .title(title)
        .content(title + " content")
        .pinned(pinned)
        .displayOrder(displayOrder)
        .publishedAt(publishedAt)
        .exposureStartAt(exposureStartAt)
        .exposureEndAt(exposureEndAt)
        .eventBannerText(eventBannerText)
        .eventLink(eventLink)
        .build();
  }

  private void flushAndClear() {
    entityManager.flush();
    entityManager.clear();
  }
}
