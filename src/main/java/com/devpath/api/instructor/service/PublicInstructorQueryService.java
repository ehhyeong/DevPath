package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.InstructorChannelDto;
import com.devpath.api.instructor.dto.InstructorPublicProfileDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Handles read-only public instructor profile and channel queries.
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PublicInstructorQueryService {

  private final UserProfileRepository userProfileRepository;
  private final UserTechStackRepository userTechStackRepository;
  private final CourseRepository courseRepository;

  public InstructorPublicProfileDto.ProfileResponse getPublicProfile(Long instructorId) {
    UserProfile userProfile = getPublicInstructorProfile(instructorId);
    return mapProfileSummary(userProfile);
  }

  public InstructorChannelDto.ChannelResponse getPublicChannel(Long instructorId) {
    UserProfile userProfile = getPublicInstructorProfile(instructorId);
    List<String> specialties = userTechStackRepository.findTagNamesByUserId(instructorId);
    List<Course> featuredCourses =
        courseRepository.findTop4ByInstructorIdAndStatusOrderByPublishedAtDescCourseIdDesc(
            instructorId, CourseStatus.PUBLISHED);

    return InstructorChannelDto.ChannelResponse.builder()
        .profile(mapProfileSummary(userProfile))
        .intro(userProfile.getBio())
        .specialties(specialties)
        .externalLinks(
            InstructorChannelDto.ExternalLinks.builder()
                .githubUrl(userProfile.getGithubUrl())
                .blogUrl(userProfile.getBlogUrl())
                .build())
        .featuredCourses(mapFeaturedCourses(featuredCourses))
        .build();
  }

  private UserProfile getPublicInstructorProfile(Long instructorId) {
    return userProfileRepository
        .findPublicInstructorProfileByUserId(instructorId, UserRole.ROLE_INSTRUCTOR)
        .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
  }

  private InstructorPublicProfileDto.ProfileResponse mapProfileSummary(UserProfile userProfile) {
    return InstructorPublicProfileDto.ProfileResponse.builder()
        .instructorId(userProfile.getUser().getId())
        .nickname(resolveDisplayName(userProfile))
        .profileImageUrl(userProfile.getProfileImage())
        .headline(userProfile.getBio())
        .isPublic(userProfile.getIsPublic())
        .build();
  }

  // Returns a minimal course card payload for the channel page.
  private List<InstructorChannelDto.FeaturedCourseItem> mapFeaturedCourses(List<Course> courses) {
    return courses.stream()
        .map(
            course ->
                InstructorChannelDto.FeaturedCourseItem.builder()
                    .courseId(course.getCourseId())
                    .title(course.getTitle())
                    .subtitle(course.getSubtitle())
                    .thumbnailUrl(course.getThumbnailUrl())
                    .build())
        .toList();
  }

  // Falls back to the account name when the instructor has not set a channel name.
  private String resolveDisplayName(UserProfile userProfile) {
    String channelName = userProfile.getChannelName();

    if (channelName != null && !channelName.isBlank()) {
      return channelName;
    }

    return userProfile.getUser().getName();
  }
}
