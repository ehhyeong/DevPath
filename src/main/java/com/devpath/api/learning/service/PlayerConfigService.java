package com.devpath.api.learning.service;

import com.devpath.api.learning.dto.PlayerConfigRequest;
import com.devpath.api.learning.dto.PlayerConfigResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.learning.entity.LessonProgress;
import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PlayerConfigService {

    private final LessonProgressRepository lessonProgressRepository;
    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;

    @Transactional
    public PlayerConfigResponse getPlayerConfig(Long userId, Long lessonId) {
        LessonProgress progress = getOrCreateLessonProgress(userId, lessonId);
        return PlayerConfigResponse.from(progress);
    }

    @Transactional
    public PlayerConfigResponse updatePlaybackRate(
            Long userId,
            Long lessonId,
            PlayerConfigRequest.UpdatePlaybackRate request
    ) {
        LessonProgress progress = getOrCreateLessonProgress(userId, lessonId);
        progress.updatePlaybackRate(request.getDefaultPlaybackRate());
        return PlayerConfigResponse.from(progress);
    }

    @Transactional
    public PlayerConfigResponse updatePipMode(
            Long userId,
            Long lessonId,
            PlayerConfigRequest.UpdatePipMode request
    ) {
        LessonProgress progress = getOrCreateLessonProgress(userId, lessonId);
        progress.updatePipMode(request.getPipEnabled());
        return PlayerConfigResponse.from(progress);
    }

    private LessonProgress getOrCreateLessonProgress(Long userId, Long lessonId) {
        return findLessonProgress(userId, lessonId)
                .orElseGet(() -> createLessonProgress(userId, lessonId));
    }

    private Optional<LessonProgress> findLessonProgress(Long userId, Long lessonId) {
        return lessonProgressRepository.findByUserIdAndLessonLessonId(userId, lessonId);
    }

    private LessonProgress createLessonProgress(Long userId, Long lessonId) {
        // 한글 주석: 플레이어 설정 조회도 최초 접근 시 기본 설정 row를 생성할 수 있다.
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new CustomException(ErrorCode.LESSON_NOT_FOUND));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        return lessonProgressRepository.save(
                LessonProgress.builder()
                        .user(user)
                        .lesson(lesson)
                        .build()
        );
    }
}
