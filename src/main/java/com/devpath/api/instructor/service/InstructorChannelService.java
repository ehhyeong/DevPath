package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.channel.ChannelInfoUpdateRequest;
import com.devpath.api.instructor.dto.channel.ChannelProfileUpdateRequest;
import com.devpath.api.instructor.entity.InstructorChannelExpertise;
import com.devpath.api.instructor.entity.InstructorChannelLink;
import com.devpath.api.instructor.entity.InstructorFeaturedCourse;
import com.devpath.api.instructor.repository.InstructorChannelExpertiseRepository;
import com.devpath.api.instructor.repository.InstructorChannelLinkRepository;
import com.devpath.api.instructor.repository.InstructorFeaturedCourseRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.repository.UserProfileRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class InstructorChannelService {

  private final UserProfileRepository userProfileRepository;
  private final CourseRepository courseRepository;
  private final InstructorChannelLinkRepository instructorChannelLinkRepository;
  private final InstructorChannelExpertiseRepository instructorChannelExpertiseRepository;
  private final InstructorFeaturedCourseRepository instructorFeaturedCourseRepository;

  public void updateProfile(Long instructorId, ChannelProfileUpdateRequest request) {
    UserProfile userProfile = getProfile(instructorId);

    List<String> externalLinks = normalizeStrings(request.getExternalLinks());
    List<String> expertiseList = normalizeStrings(request.getExpertiseList());

    userProfile.updateChannelProfile(
        request.getIntroduction(),
        request.getProfileImageUrl(),
        findGithubLink(externalLinks),
        findBlogLink(externalLinks));

    replaceLinks(instructorId, externalLinks);
    replaceExpertise(instructorId, expertiseList);
  }

  public void updateChannelInfo(Long instructorId, ChannelInfoUpdateRequest request) {
    UserProfile userProfile = getProfile(instructorId);

    userProfile.updateChannelInfo(request.getChannelName(), request.getChannelDescription());

    replaceFeaturedCourses(instructorId, request.getFeaturedCourseIds());
  }

  private UserProfile getProfile(Long instructorId) {
    return userProfileRepository
        .findByUserId(instructorId)
        .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
  }

  // Trim blanks, drop nulls, and keep first-seen order.
  private List<String> normalizeStrings(List<String> values) {
    if (values == null || values.isEmpty()) {
      return List.of();
    }

    List<String> normalized = new ArrayList<>();
    for (String value : values) {
      if (value == null) {
        continue;
      }

      String trimmed = value.trim();
      if (trimmed.isEmpty()) {
        continue;
      }

      if (!normalized.contains(trimmed)) {
        normalized.add(trimmed);
      }
    }
    return normalized;
  }

  // Replace the active links with the newly submitted ordered set.
  private void replaceLinks(Long instructorId, List<String> links) {
    instructorChannelLinkRepository
        .findAllByInstructorIdAndIsDeletedFalseOrderBySortOrderAsc(instructorId)
        .forEach(InstructorChannelLink::delete);

    for (int i = 0; i < links.size(); i++) {
      instructorChannelLinkRepository.save(
          InstructorChannelLink.builder()
              .instructorId(instructorId)
              .url(links.get(i))
              .sortOrder(i + 1)
              .build());
    }
  }

  // Replace the expertise list while preserving UI order.
  private void replaceExpertise(Long instructorId, List<String> expertiseList) {
    instructorChannelExpertiseRepository
        .findAllByInstructorIdAndIsDeletedFalseOrderBySortOrderAsc(instructorId)
        .forEach(InstructorChannelExpertise::delete);

    for (int i = 0; i < expertiseList.size(); i++) {
      instructorChannelExpertiseRepository.save(
          InstructorChannelExpertise.builder()
              .instructorId(instructorId)
              .expertiseName(expertiseList.get(i))
              .sortOrder(i + 1)
              .build());
    }
  }

  // Featured courses must belong to the instructor and are capped at four.
  private void replaceFeaturedCourses(Long instructorId, List<Long> featuredCourseIds) {
    List<Long> normalizedIds =
        featuredCourseIds == null
            ? List.of()
            : featuredCourseIds.stream().filter(Objects::nonNull).distinct().toList();

    if (normalizedIds.size() > 4) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    for (Long courseId : normalizedIds) {
      if (!courseRepository.existsByCourseIdAndInstructorId(courseId, instructorId)) {
        throw new CustomException(ErrorCode.COURSE_NOT_FOUND);
      }
    }

    instructorFeaturedCourseRepository
        .findAllByInstructorIdAndIsDeletedFalseOrderBySortOrderAsc(instructorId)
        .forEach(InstructorFeaturedCourse::delete);

    for (int i = 0; i < normalizedIds.size(); i++) {
      instructorFeaturedCourseRepository.save(
          InstructorFeaturedCourse.builder()
              .instructorId(instructorId)
              .courseId(normalizedIds.get(i))
              .sortOrder(i + 1)
              .build());
    }
  }

  // Keep legacy github/blog profile fields populated from the ordered link list.
  private String findGithubLink(List<String> links) {
    return links.stream().filter(link -> link.contains("github.com")).findFirst().orElse(null);
  }

  private String findBlogLink(List<String> links) {
    return links.stream().filter(link -> !link.contains("github.com")).findFirst().orElse(null);
  }
}
