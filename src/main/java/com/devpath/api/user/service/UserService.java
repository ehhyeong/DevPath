package com.devpath.api.user.service;

import com.devpath.api.user.dto.UserProfileSetupRequest;
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
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

  @Transactional
  public void setupUserProfileAndTags(Long userId, UserProfileSetupRequest request) {
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

    UserProfile profile =
        userProfileRepository
            .findByUserId(userId)
            .orElseGet(() -> UserProfile.builder().user(user).build());

    profile.updateOnboardingProfile(request.bio(), request.phone());
    userProfileRepository.save(profile);

    userTechStackRepository.deleteByUserId(userId);

    if (request.tagIds() != null && !request.tagIds().isEmpty()) {
      List<Tag> tags = tagRepository.findAllById(request.tagIds());
      List<UserTechStack> techStacks =
          tags.stream()
              .map(tag -> UserTechStack.builder().user(user).tag(tag).build())
              .collect(Collectors.toList());
      userTechStackRepository.saveAll(techStacks);
    }

    log.info("프로필 설정이 완료되었습니다. 사용자ID={}", userId);
  }
}
