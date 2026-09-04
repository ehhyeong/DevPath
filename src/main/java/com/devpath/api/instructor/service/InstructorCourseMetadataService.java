package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.InstructorCourseDto;
import com.devpath.api.instructor.dto.InstructorMaterialDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseMaterial;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.repository.CourseMaterialRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class InstructorCourseMetadataService {

  private final UserRepository userRepository;
  private final CourseRepository courseRepository;
  private final LessonRepository lessonRepository;
  private final CourseMaterialRepository courseMaterialRepository;
  private final InstructorCourseAssetStorage assetStorage;
  private final InstructorCourseMetadataEditor metadataEditor;

  @Transactional
  public void updateCourseMetadata(
      Long instructorId, Long courseId, InstructorCourseDto.UpdateMetadataRequest request) {
    validateAuthenticatedUser(instructorId);

    Course course = getOwnedCourse(instructorId, courseId);
    metadataEditor.updateMetadata(course, request);
  }

  @Transactional
  public void replaceObjectives(
      Long instructorId, Long courseId, InstructorCourseDto.ReplaceObjectivesRequest request) {
    validateAuthenticatedUser(instructorId);

    Course course = getOwnedCourse(instructorId, courseId);
    metadataEditor.replaceObjectives(course, request.getObjectives());
  }

  @Transactional
  public void replaceTargetAudiences(
      Long instructorId, Long courseId, InstructorCourseDto.ReplaceTargetAudiencesRequest request) {
    validateAuthenticatedUser(instructorId);

    Course course = getOwnedCourse(instructorId, courseId);
    metadataEditor.replaceTargetAudiences(course, request.getTargetAudiences());
  }

  @Transactional
  public void replaceInfoSections(
      Long instructorId, Long courseId, InstructorCourseDto.ReplaceInfoSectionsRequest request) {
    validateAuthenticatedUser(instructorId);

    Course course = getOwnedCourse(instructorId, courseId);
    metadataEditor.replaceInfoSections(course, request);
  }

  @Transactional
  public Long createMaterial(
      Long instructorId, Long lessonId, InstructorMaterialDto.CreateMaterialRequest request) {
    validateAuthenticatedUser(instructorId);

    Lesson lesson = getOwnedLesson(instructorId, lessonId);

    CourseMaterial material =
        CourseMaterial.builder()
            .lesson(lesson)
            .materialType(request.getMaterialType())
            .materialUrl(request.getMaterialUrl())
            .assetKey(request.getAssetKey())
            .originalFileName(request.getOriginalFileName())
            .displayOrder(request.getDisplayOrder())
            .build();

    CourseMaterial savedMaterial = courseMaterialRepository.save(material);
    return savedMaterial.getMaterialId();
  }

  public InstructorCourseDto.UploadedAssetResponse uploadCourseAsset(
      Long instructorId, MultipartFile file, String assetType) {
    validateAuthenticatedUser(instructorId);
    return assetStorage.store(instructorId, file, assetType);
  }

  @Transactional
  public void uploadThumbnail(
      Long instructorId, Long courseId, InstructorCourseDto.UploadThumbnailRequest request) {
    validateAuthenticatedUser(instructorId);

    Course course = getOwnedCourse(instructorId, courseId);
    course.updateThumbnail(request.getThumbnailUrl());
  }

  @Transactional
  public void uploadTrailer(
      Long instructorId, Long courseId, InstructorCourseDto.UploadTrailerRequest request) {
    validateAuthenticatedUser(instructorId);

    Course course = getOwnedCourse(instructorId, courseId);
    course.updateTrailer(
        request.getTrailerUrl(), request.getVideoAssetKey(), request.getDurationSeconds());
  }

  private void validateAuthenticatedUser(Long instructorId) {
    if (instructorId == null) {
      throw new CustomException(ErrorCode.UNAUTHORIZED);
    }

    if (!userRepository.existsById(instructorId)) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
  }

  private Course getOwnedCourse(Long instructorId, Long courseId) {
    return courseRepository
        .findByCourseIdAndInstructorId(courseId, instructorId)
        .orElseGet(
            () -> {
              if (courseRepository.existsById(courseId)) {
                throw new CustomException(ErrorCode.FORBIDDEN);
              }
              throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND);
            });
  }

  private Lesson getOwnedLesson(Long instructorId, Long lessonId) {
    return lessonRepository
        .findByLessonIdAndSectionCourseInstructorId(lessonId, instructorId)
        .orElseGet(
            () -> {
              if (lessonRepository.existsById(lessonId)) {
                throw new CustomException(ErrorCode.FORBIDDEN);
              }
              throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND);
            });
  }
}
