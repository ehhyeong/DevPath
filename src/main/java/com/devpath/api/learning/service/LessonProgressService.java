package com.devpath.api.learning.service;

import com.devpath.api.learning.dto.LessonProgressRequest;
import com.devpath.api.learning.dto.LessonProgressResponse;
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
public class LessonProgressService {

    private final LessonProgressRepository lessonProgressRepository;
    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;

    @Transactional
    public LessonProgressResponse startSession(Long userId, Long lessonId) {
        LessonProgress progress = getOrCreateLessonProgress(userId, lessonId);
        return LessonProgressResponse.from(progress);
    }

    @Transactional
    public LessonProgressResponse saveProgress(
            Long userId,
            Long lessonId,
            LessonProgressRequest.SaveProgress request
    ) {
        LessonProgress progress = getOrCreateLessonProgress(userId, lessonId);
        progress.updateProgress(request.getProgressPercent(), request.getProgressSeconds());
        return LessonProgressResponse.from(progress);
    }

    @Transactional(readOnly = true)
    public LessonProgressResponse getProgress(Long userId, Long lessonId) {
        validateLessonExists(lessonId);
        return findLessonProgress(userId, lessonId)
                .map(LessonProgressResponse::from)
                .orElseGet(() -> LessonProgressResponse.defaultForLesson(lessonId));
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
