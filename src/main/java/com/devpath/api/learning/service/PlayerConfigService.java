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

    @Transactional(readOnly = true)
    public PlayerConfigResponse getPlayerConfig(Long userId, Long lessonId) {
        validateLessonExists(lessonId);
        return findLessonProgress(userId, lessonId)
                .map(PlayerConfigResponse::from)
                .orElseGet(() -> PlayerConfigResponse.defaultForLesson(lessonId));
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
        User user = validateUser(userId);
        Lesson lesson = validateLessonExists(lessonId);

        return lessonProgressRepository.save(
                LessonProgress.builder()
                        .user(user)
                        .lesson(lesson)
                        .build()
        );
    }

    private User validateUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private Lesson validateLessonExists(Long lessonId) {
        return lessonRepository.findById(lessonId)
                .orElseThrow(() -> new CustomException(ErrorCode.LESSON_NOT_FOUND));
    }
}
