package com.devpath.api.course.service;

import static com.devpath.common.security.AdminAuthorityService.GOVERNANCE_MANAGE;
import static com.devpath.common.security.AdminAuthorityService.SUPER_ADMIN_AUTHORITY;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.common.security.AdminAuthorityService;
import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.repository.CourseEnrollmentRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserRepository;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.Locale;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class HlsPlaybackService {

  private static final String HMAC_ALGORITHM = "HmacSHA256";

  private final LessonRepository lessonRepository;
  private final CourseEnrollmentRepository courseEnrollmentRepository;
  private final UserRepository userRepository;
  private final AdminAuthorityService adminAuthorityService;
  private final Path uploadRoot;
  private final byte[] signingSecret;
  private final Duration urlTtl;
  private final Clock clock;

  @Autowired
  public HlsPlaybackService(
      LessonRepository lessonRepository,
      CourseEnrollmentRepository courseEnrollmentRepository,
      UserRepository userRepository,
      AdminAuthorityService adminAuthorityService,
      @Value("${app.upload.dir:./uploads}") String uploadBaseDir,
      @Value("${app.media.hls-url-signing-secret:devpath-local-hls-signing-key}")
          String signingSecret,
      @Value("${app.media.hls-url-ttl:10m}") Duration urlTtl) {
    this(
        lessonRepository,
        courseEnrollmentRepository,
        userRepository,
        adminAuthorityService,
        Paths.get(uploadBaseDir).toAbsolutePath().normalize(),
        signingSecret,
        urlTtl,
        Clock.systemUTC());
  }

  HlsPlaybackService(
      LessonRepository lessonRepository,
      CourseEnrollmentRepository courseEnrollmentRepository,
      UserRepository userRepository,
      AdminAuthorityService adminAuthorityService,
      Path uploadRoot,
      String signingSecret,
      Duration urlTtl,
      Clock clock) {
    this.lessonRepository = lessonRepository;
    this.courseEnrollmentRepository = courseEnrollmentRepository;
    this.userRepository = userRepository;
    this.adminAuthorityService = adminAuthorityService;
    this.uploadRoot = uploadRoot;
    this.signingSecret = signingSecret.getBytes(StandardCharsets.UTF_8);
    this.urlTtl = urlTtl;
    this.clock = clock;
  }

  public String issuePlaybackUrl(Lesson lesson, Long userId) {
    if (!isLocalHls(lesson.getVideoUrl(), lesson.getVideoId())) {
      return lesson.getVideoUrl();
    }
    if (!canAccess(lesson, userId)) {
      return null;
    }

    long expiresAt = clock.instant().plus(urlTtl).getEpochSecond();
    return assetUrl(lesson.getLessonId(), "index.m3u8", expiresAt);
  }

  public HlsAsset loadAsset(Long lessonId, String fileName, long expiresAt, String signature) {
    validateFileName(fileName);
    if (expiresAt < clock.instant().getEpochSecond()
        || !constantTimeEquals(signature, sign(lessonId, expiresAt))) {
      throw new CustomException(ErrorCode.FORBIDDEN);
    }

    Lesson lesson =
        lessonRepository
            .findByIdWithCourse(lessonId)
            .orElseThrow(() -> new CustomException(ErrorCode.LESSON_NOT_FOUND));
    Path playlistPath = resolvePlaylistPath(lesson);
    Path assetPath = playlistPath.getParent().resolve(fileName).normalize();
    if (!assetPath.startsWith(playlistPath.getParent()) || !Files.isRegularFile(assetPath)) {
      throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND);
    }

    try {
      byte[] body = Files.readAllBytes(assetPath);
      if (fileName.toLowerCase(Locale.ROOT).endsWith(".m3u8")) {
        String playlist = new String(body, StandardCharsets.UTF_8);
        body = rewritePlaylist(playlist, lessonId, expiresAt).getBytes(StandardCharsets.UTF_8);
      }
      return new HlsAsset(body, contentType(fileName));
    } catch (IOException exception) {
      throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND);
    }
  }

  private boolean canAccess(Lesson lesson, Long userId) {
    if (Boolean.TRUE.equals(lesson.getIsPreview())
        && lesson.getSection().getCourse().getStatus() == CourseStatus.PUBLISHED) {
      return true;
    }
    if (userId == null) {
      return false;
    }

    Long courseId = lesson.getSection().getCourse().getCourseId();
    if (courseEnrollmentRepository.existsByUser_IdAndCourse_CourseId(userId, courseId)
        || userId.equals(lesson.getSection().getCourse().getInstructorId())) {
      return true;
    }

    User user = userRepository.findById(userId).orElse(null);
    if (user == null || user.getRole() != UserRole.ROLE_ADMIN) {
      return false;
    }
    var authorities = adminAuthorityService.resolveAuthorities(user);
    return authorities.contains(SUPER_ADMIN_AUTHORITY) || authorities.contains(GOVERNANCE_MANAGE);
  }

  private Path resolvePlaylistPath(Lesson lesson) {
    String assetKey = lesson.getVideoId();
    if (assetKey == null || !assetKey.toLowerCase(Locale.ROOT).endsWith(".m3u8")) {
      String videoUrl = lesson.getVideoUrl();
      if (videoUrl == null || !videoUrl.startsWith("/uploads/")) {
        throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND);
      }
      assetKey = videoUrl.substring("/uploads/".length());
    }

    Path playlistPath = uploadRoot.resolve(assetKey).normalize();
    String normalizedKey = assetKey.replace('\\', '/');
    if (!playlistPath.startsWith(uploadRoot)
        || !normalizedKey.contains("/lesson-video/")
        || !normalizedKey.contains("_hls/")) {
      throw new CustomException(ErrorCode.FORBIDDEN);
    }
    return playlistPath;
  }

  private String rewritePlaylist(String playlist, Long lessonId, long expiresAt) {
    StringBuilder rewritten = new StringBuilder();
    for (String line : playlist.split("\\R")) {
      String next = line;
      if (line.startsWith("#EXT-X-KEY") && line.contains("URI=\"")) {
        int start = line.indexOf("URI=\"") + 5;
        int end = line.indexOf('"', start);
        String fileName = Paths.get(line.substring(start, end)).getFileName().toString();
        next =
            line.substring(0, start)
                + assetUrl(lessonId, fileName, expiresAt)
                + line.substring(end);
      } else if (!line.isBlank() && !line.startsWith("#")) {
        String fileName = Paths.get(line.trim()).getFileName().toString();
        next = assetUrl(lessonId, fileName, expiresAt);
      }
      rewritten.append(next).append('\n');
    }
    return rewritten.toString();
  }

  private String assetUrl(Long lessonId, String fileName, long expiresAt) {
    return "/api/media/hls/"
        + lessonId
        + "/"
        + fileName
        + "?expires="
        + expiresAt
        + "&signature="
        + sign(lessonId, expiresAt);
  }

  private String sign(Long lessonId, long expiresAt) {
    try {
      Mac mac = Mac.getInstance(HMAC_ALGORITHM);
      mac.init(new SecretKeySpec(signingSecret, HMAC_ALGORITHM));
      byte[] signature = mac.doFinal((lessonId + ":" + expiresAt).getBytes(StandardCharsets.UTF_8));
      return Base64.getUrlEncoder().withoutPadding().encodeToString(signature);
    } catch (Exception exception) {
      throw new IllegalStateException("HLS URL 서명을 생성하지 못했습니다.", exception);
    }
  }

  private boolean constantTimeEquals(String actual, String expected) {
    if (actual == null) {
      return false;
    }
    return java.security.MessageDigest.isEqual(
        actual.getBytes(StandardCharsets.UTF_8), expected.getBytes(StandardCharsets.UTF_8));
  }

  private void validateFileName(String fileName) {
    if (fileName == null || !fileName.matches("[A-Za-z0-9._-]+")) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }
  }

  private boolean isLocalHls(String videoUrl, String assetKey) {
    String value = assetKey != null ? assetKey : videoUrl;
    return value != null
        && value.toLowerCase(Locale.ROOT).endsWith(".m3u8")
        && (value.contains("/lesson-video/") || value.contains("\\lesson-video\\"));
  }

  private String contentType(String fileName) {
    String lower = fileName.toLowerCase(Locale.ROOT);
    if (lower.endsWith(".m3u8")) {
      return "application/vnd.apple.mpegurl";
    }
    if (lower.endsWith(".ts")) {
      return "video/mp2t";
    }
    return "application/octet-stream";
  }

  public record HlsAsset(byte[] body, String contentType) {}
}
