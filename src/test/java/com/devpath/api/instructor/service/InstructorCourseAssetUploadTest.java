package com.devpath.api.instructor.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.devpath.api.instructor.dto.InstructorCourseDto;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

class InstructorCourseAssetUploadTest {

  @TempDir Path uploadDirectory;

  @Test
  void uploadCourseAssetSanitizesPathAndStoresContent() throws Exception {
    InstructorCourseAssetStorage storage =
        new InstructorCourseAssetStorage(uploadDirectory.toString());
    MockMultipartFile file =
        new MockMultipartFile(
            "file", "course cover.png", "image/png", "thumbnail-content".getBytes());

    InstructorCourseDto.UploadedAssetResponse result = storage.store(1L, file, "Course Thumbnails");

    assertThat(result.getAssetKey()).startsWith("courses/1/course-thumbnails/");
    assertThat(result.getOriginalFileName()).isEqualTo("course_cover.png");
    assertThat(result.getStoredFileName()).endsWith("_course_cover.png");
    assertThat(result.getUrl()).isEqualTo("/uploads/" + result.getAssetKey());
    assertThat(Files.readString(uploadDirectory.resolve(result.getAssetKey())))
        .isEqualTo("thumbnail-content");
  }
}
