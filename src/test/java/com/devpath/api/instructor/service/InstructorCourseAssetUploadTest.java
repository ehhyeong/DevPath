package com.devpath.api.instructor.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.devpath.api.instructor.dto.InstructorCourseDto;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

class InstructorCourseAssetUploadTest {

  @TempDir Path uploadDirectory;

  @Test
  void uploadCourseAssetSanitizesPathAndStoresContent() throws Exception {
    InstructorCourseVideoProcessor videoProcessor = mock(InstructorCourseVideoProcessor.class);
    when(videoProcessor.process(any(), any(), anyString(), anyString(), anyString()))
        .thenReturn(Optional.empty());
    InstructorCourseAssetStorage storage =
        new InstructorCourseAssetStorage(uploadDirectory.toString(), videoProcessor);
    MockMultipartFile file =
        new MockMultipartFile(
            "file", "course cover.png", "image/png", "thumbnail-content".getBytes());

    InstructorCourseDto.UploadedAssetResponse result = storage.store(1L, file, "Course Thumbnails");

    assertThat(result.getAssetKey()).startsWith("courses/1/course-thumbnails/");
    assertThat(result.getOriginalFileName()).isEqualTo("course_cover.png");
    assertThat(result.getStoredFileName()).endsWith("_course_cover.png");
    assertThat(result.getUrl()).isEqualTo("/uploads/" + result.getAssetKey());
    assertThat(result.getOriginalUrl()).isEqualTo(result.getUrl());
    assertThat(result.isTranscoded()).isFalse();
    assertThat(Files.readString(uploadDirectory.resolve(result.getAssetKey())))
        .isEqualTo("thumbnail-content");
  }

  @Test
  void uploadLessonVideoReturnsHlsAssetAndKeepsOriginalMetadata() {
    InstructorCourseVideoProcessor videoProcessor = mock(InstructorCourseVideoProcessor.class);
    when(videoProcessor.process(any(), any(), anyString(), anyString(), anyString()))
        .thenReturn(
            Optional.of(
                new InstructorCourseVideoProcessor.ProcessedVideo(
                    "/uploads/courses/1/lesson-video/video_hls/index.m3u8",
                    "courses/1/lesson-video/video_hls/index.m3u8",
                    "index.m3u8",
                    128)));
    InstructorCourseAssetStorage storage =
        new InstructorCourseAssetStorage(uploadDirectory.toString(), videoProcessor);
    MockMultipartFile file =
        new MockMultipartFile("file", "lesson.mp4", "video/mp4", "video".getBytes());

    InstructorCourseDto.UploadedAssetResponse result = storage.store(1L, file, "lesson-video");

    assertThat(result.getUrl()).endsWith("/video_hls/index.m3u8");
    assertThat(result.getAssetKey()).endsWith("/video_hls/index.m3u8");
    assertThat(result.getContentType()).isEqualTo("application/vnd.apple.mpegurl");
    assertThat(result.getOriginalUrl()).endsWith("_lesson.mp4");
    assertThat(result.getOriginalAssetKey()).endsWith("_lesson.mp4");
    assertThat(result.isTranscoded()).isTrue();
  }
}
