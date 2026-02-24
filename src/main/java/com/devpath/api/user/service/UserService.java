package com.devpath.api.user.service;

import com.devpath.api.user.dto.UserProfileSetupRequest;
import com.devpath.api.user.repository.TagRepository;
import com.devpath.api.user.repository.UserProfileRepository;
import com.devpath.api.user.repository.UserRepository;
import com.devpath.api.user.repository.UserTechStackRepository;
import com.devpath.domain.user.entity.Tag;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.entity.UserTechStack;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

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
        // 1. 유저 검증
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));

        // 2. 프로필 조회 후 업데이트 (없으면 새로 만들기)
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseGet(() -> UserProfile.builder().user(user).build());

        // 엔티티에 추가했던 온보딩 전용 메서드 사용!
        profile.updateOnboardingProfile(request.bio(), request.phone());
        userProfileRepository.save(profile);

        // 3. 기존 기술 스택(태그) 초기화
        userTechStackRepository.deleteByUserId(userId);

        // 4. 새로운 태그 목록 저장
        if (request.tagIds() != null && !request.tagIds().isEmpty()) {
            List<Tag> tags = tagRepository.findAllById(request.tagIds());
            List<UserTechStack> techStacks = tags.stream()
                    .map(tag -> UserTechStack.builder()
                            .user(user)
                            .tag(tag)
                            .build())
                    .collect(Collectors.toList());
            userTechStackRepository.saveAll(techStacks);
        }

        log.info("온보딩 프로필 및 태그 설정 완료 - userId: {}", userId);
    }
}