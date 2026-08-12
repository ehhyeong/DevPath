package com.devpath.api.course.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.devpath.common.exception.CustomException;
import com.devpath.common.security.AdminAuthorityService;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseSection;
import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.repository.CourseEnrollmentRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

class HlsPlaybackServiceTest {

  @TempDir Path uploadRoot;

  @Test
  void protectsPlaylistSegmentsAndEncryptionKeyWithOneExpirySignature() throws Exception {
    Fixture fixture = fixture(false);
    when(fixture.enrollmentRepository.existsByUser_IdAndCourse_CourseId(20L, 10L)).thenReturn(true);

    String playbackUrl = fixture.service.issuePlaybackUrl(fixture.lesson, 20L);
    Query query = query(playbackUrl);
    HlsPlaybackService.HlsAsset playlist =
        fixture.service.loadAsset(30L, "index.m3u8", query.expires(), query.signature());
    String body = new String(playlist.body(), StandardCharsets.UTF_8);

    assertThat(body).contains("/api/media/hls/30/encryption.key?expires=");
    assertThat(body).contains("/api/media/hls/30/segment_00000.ts?expires=");
    assertThat(
            fixture
                .service
                .loadAsset(30L, "segment_00000.ts", query.expires(), query.signature())
                .body())
        .containsExactly(1, 2, 3);
    assertThat(
            fixture
                .service
                .loadAsset(30L, "encryption.key", query.expires(), query.signature())
                .body())
        .hasSize(16);
    assertThatThrownBy(
            () -> fixture.service.loadAsset(30L, "encryption.key", query.expires(), "invalid"))
        .isInstanceOf(CustomException.class);
  }

  @Test
  void allowsPreviewOwnerAndAuthorizedAdminButRejectsAnonymousProtectedLesson() throws Exception {
    Fixture protectedFixture = fixture(false);
    assertThat(protectedFixture.service.issuePlaybackUrl(protectedFixture.lesson, null)).isNull();
    assertThat(protectedFixture.service.issuePlaybackUrl(protectedFixture.lesson, 5L))
        .startsWith("/api/media/hls/30/index.m3u8");

    User admin =
        User.builder()
            .email("hls-admin@devpath.com")
            .password("encoded")
            .name("관리자")
            .role(UserRole.ROLE_ADMIN)
            .build();
    ReflectionTestUtils.setField(admin, "id", 99L);
    when(protectedFixture.userRepository.findById(99L)).thenReturn(Optional.of(admin));
    when(protectedFixture.adminAuthorityService.resolveAuthorities(admin))
        .thenReturn(List.of("ROLE_ADMIN", "ADMIN_GOVERNANCE_MANAGE"));
    assertThat(protectedFixture.service.issuePlaybackUrl(protectedFixture.lesson, 99L))
        .startsWith("/api/media/hls/30/index.m3u8");

    Fixture previewFixture = fixture(true);
    assertThat(previewFixture.service.issuePlaybackUrl(previewFixture.lesson, null))
        .startsWith("/api/media/hls/30/index.m3u8");
  }

  private Fixture fixture(boolean preview) throws Exception {
    LessonRepository lessonRepository = mock(LessonRepository.class);
    CourseEnrollmentRepository enrollmentRepository = mock(CourseEnrollmentRepository.class);
    UserRepository userRepository = mock(UserRepository.class);
    AdminAuthorityService adminAuthorityService = mock(AdminAuthorityService.class);
    User instructor =
        User.builder()
            .email("hls-instructor@devpath.com")
            .password("encoded")
            .name("강사")
            .role(UserRole.ROLE_INSTRUCTOR)
            .build();
    ReflectionTestUtils.setField(instructor, "id", 5L);
    Course course =
        Course.builder()
            .instructor(instructor)
            .instructorId(5L)
            .title("보호 강의")
            .status(CourseStatus.PUBLISHED)
            .build();
    ReflectionTestUtils.setField(course, "courseId", 10L);
    CourseSection section =
        CourseSection.builder().course(course).title("섹션").isPublished(true).build();
    Lesson lesson =
        Lesson.builder()
            .section(section)
            .title("HLS")
            .videoUrl("/uploads/courses/5/lesson-video/video_hls/index.m3u8")
            .videoId("courses/5/lesson-video/video_hls/index.m3u8")
            .isPreview(preview)
            .isPublished(true)
            .build();
    ReflectionTestUtils.setField(lesson, "lessonId", 30L);

    Path directory = uploadRoot.resolve("courses/5/lesson-video/video_hls");
    Files.createDirectories(directory);
    Files.writeString(
        directory.resolve("index.m3u8"),
        "#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI=\"/uploads/courses/5/lesson-video/video_hls/encryption.key\"\n#EXTINF:6,\nsegment_00000.ts\n");
    Files.write(directory.resolve("segment_00000.ts"), new byte[] {1, 2, 3});
    Files.write(directory.resolve("encryption.key"), new byte[16]);
    when(lessonRepository.findByIdWithCourse(30L)).thenReturn(Optional.of(lesson));

    HlsPlaybackService service =
        new HlsPlaybackService(
            lessonRepository,
            enrollmentRepository,
            userRepository,
            adminAuthorityService,
            uploadRoot,
            "test-secret",
            Duration.ofMinutes(10),
            Clock.fixed(Instant.parse("2026-08-12T00:00:00Z"), ZoneOffset.UTC));
    return new Fixture(
        service, lesson, enrollmentRepository, userRepository, adminAuthorityService);
  }

  private Query query(String url) {
    String query = url.substring(url.indexOf('?') + 1);
    var values = new java.util.HashMap<String, String>();
    for (String pair : query.split("&")) {
      String[] parts = pair.split("=", 2);
      values.put(parts[0], parts[1]);
    }
    return new Query(Long.parseLong(values.get("expires")), values.get("signature"));
  }

  private record Query(long expires, String signature) {}

  private record Fixture(
      HlsPlaybackService service,
      Lesson lesson,
      CourseEnrollmentRepository enrollmentRepository,
      UserRepository userRepository,
      AdminAuthorityService adminAuthorityService) {}
}
