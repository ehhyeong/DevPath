package com.devpath.api.user.service;

import com.devpath.api.user.dto.UserPasswordChangeRequest;
import com.devpath.api.user.dto.UserProfileResponse;
import com.devpath.api.user.dto.UserProfileSetupRequest;
import com.devpath.api.user.dto.UserProfileUpdateRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.user.entity.Tag;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.entity.UserTechStack;
import com.devpath.domain.user.repository.TagRepository;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

  private final UserRepository userRepository;
  private final UserProfileRepository userProfileRepository;
  private final TagRepository tagRepository;
  private final UserTechStackRepository userTechStackRepository;
  private final PasswordEncoder passwordEncoder;

  // 온보딩 단계에서 프로필 기본 정보와 기술 태그를 함께 저장한다.
  @Transactional
  public void setupUserProfileAndTags(Long userId, UserProfileSetupRequest request) {
    User user = getUser(userId);
    UserProfile profile =
        userProfileRepository
            .findByUserId(userId)
            .orElseGet(() -> UserProfile.builder().user(user).build());

    profile.updateOnboardingProfile(request.bio(), request.phone());
    userProfileRepository.save(profile);
    replaceUserTags(userId, user, request.tagIds());

    log.info("프로필 온보딩 설정이 완료되었습니다. userId={}", userId);
  }

  // 현재 로그인한 사용자의 프로필과 태그를 조회한다.
  @Transactional(readOnly = true)
  public UserProfileResponse getMyProfile(Long userId) {
    User user = getUser(userId);
    UserProfile profile = userProfileRepository.findByUserId(userId).orElse(null);
    List<UserProfileResponse.TagItem> tags = getUserTagItems(userId);

    return UserProfileResponse.of(user, profile, tags);
  }

  // 학습자 프로필 화면에서 수정 가능한 필드를 저장한다.
  @Transactional
  public UserProfileResponse updateMyProfile(Long userId, UserProfileUpdateRequest request) {
    User user = getUser(userId);
    UserProfile profile =
        userProfileRepository
            .findByUserId(userId)
            .orElseGet(() -> UserProfile.builder().user(user).build());

    user.updateName(request.name());
    profile.updateLearnerProfile(
        request.bio(),
        request.phone(),
        request.profileImage(),
        request.channelName(),
        request.githubUrl(),
        request.blogUrl());
    userProfileRepository.save(profile);
    replaceUserTags(userId, user, request.tagIds());

    return getMyProfile(userId);
  }

  // 현재 비밀번호를 검증한 뒤 새 비밀번호로 교체한다.
  @Transactional
  public void changePassword(Long userId, UserPasswordChangeRequest request) {
    User user = getUser(userId);

    if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
      throw new CustomException(ErrorCode.INVALID_CREDENTIALS);
    }

    user.changePassword(passwordEncoder.encode(request.newPassword()));
  }

  // 프로필 편집 화면에서 사용할 공식 태그 목록을 반환한다.
  @Transactional(readOnly = true)
  public List<UserProfileResponse.TagItem> getOfficialTags() {
    return tagRepository.findAllByIsOfficialTrueAndIsDeletedFalseOrderByTagIdAsc().stream()
        .map(
            tag ->
                new UserProfileResponse.TagItem(tag.getTagId(), tag.getName(), tag.getCategory()))
        .toList();
  }

  // 공통 사용자 조회 로직을 한곳에 모아 예외 처리를 일관되게 유지한다.
  private User getUser(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }

  // 사용자와 연결된 기술 태그를 응답 DTO 형태로 변환한다.
  private List<UserProfileResponse.TagItem> getUserTagItems(Long userId) {
    return userTechStackRepository.findAllByUser_Id(userId).stream()
        .map(
            techStack ->
                new UserProfileResponse.TagItem(
                    techStack.getTag().getTagId(),
                    techStack.getTag().getName(),
                    techStack.getTag().getCategory()))
        .toList();
  }

  // 태그 수정은 전체 교체 방식으로 단순하게 유지한다.
  private void replaceUserTags(Long userId, User user, List<Long> tagIds) {
    userTechStackRepository.deleteByUserId(userId);

    if (tagIds == null || tagIds.isEmpty()) {
      return;
    }

    List<Tag> tags = tagRepository.findAllById(tagIds);
    List<UserTechStack> techStacks =
        tags.stream().map(tag -> UserTechStack.builder().user(user).tag(tag).build()).toList();
    userTechStackRepository.saveAll(techStacks);
  }
}
