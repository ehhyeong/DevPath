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

// Lesson Progress 서비스
@Service
@RequiredArgsConstructor
public class LessonProgressService {

    // Lesson Progress 저장소
    private final LessonProgressRepository lessonProgressRepository;

    // Lesson 저장소
    private final LessonRepository lessonRepository;

    // User 저장소
    private final UserRepository userRepository;

    // 강의 세션을 시작한다.
    @Transactional
    public LessonProgressResponse startSession(Long userId, Long lessonId) {
        LessonProgress progress = getOrCreateLessonProgress(userId, lessonId);
        return LessonProgressResponse.from(progress);
    }

    // 진도율을 저장한다.
    @Transactional
    public LessonProgressResponse saveProgress(
        Long userId,
        Long lessonId,
        LessonProgressRequest.SaveProgress request
    ) {
        LessonProgress progress = getOrCreateLessonProgress(userId, lessonId);
        Lesson lesson = validateLessonExists(lessonId);

        int normalizedProgressPercent = normalizeProgressPercent(request.getProgressPercent());
        int normalizedProgressSeconds = normalizeProgressSeconds(
            request.getProgressSeconds(),
            lesson.getDurationSeconds(),
            normalizedProgressPercent
        );

        progress.updateProgress(normalizedProgressPercent, normalizedProgressSeconds);

        return LessonProgressResponse.from(progress);
    }

    // 현재 진도율을 조회한다.
    @Transactional(readOnly = true)
    public LessonProgressResponse getProgress(Long userId, Long lessonId) {
        validateLessonExists(lessonId);

        return findLessonProgress(userId, lessonId)
            .map(LessonProgressResponse::from)
            .orElseGet(() -> LessonProgressResponse.defaultForLesson(lessonId));
    }

    // 기존 진도를 조회하거나 없으면 생성한다.
    private LessonProgress getOrCreateLessonProgress(Long userId, Long lessonId) {
        return findLessonProgress(userId, lessonId)
            .orElseGet(() -> createLessonProgress(userId, lessonId));
    }

    // 특정 유저의 특정 레슨 진도를 조회한다.
    private Optional<LessonProgress> findLessonProgress(Long userId, Long lessonId) {
        return lessonProgressRepository.findByUserIdAndLessonLessonId(userId, lessonId);
    }

    // 진도 엔티티를 새로 생성한다.
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

    // 유저 존재 여부를 검증한다.
    private User validateUser(Long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    // 레슨 존재 여부를 검증한다.
    private Lesson validateLessonExists(Long lessonId) {
        return lessonRepository.findById(lessonId)
            .orElseThrow(() -> new CustomException(ErrorCode.LESSON_NOT_FOUND));
    }

    // 진도율 범위를 정규화한다.
    private int normalizeProgressPercent(Integer progressPercent) {
        return Math.max(0, Math.min(progressPercent, 100));
    }

    // 재생 위치를 정규화한다.
    private int normalizeProgressSeconds(Integer progressSeconds, Integer durationSeconds, int progressPercent) {
        int normalizedProgressSeconds = Math.max(progressSeconds, 0);

        if (progressPercent >= 100 && durationSeconds != null && durationSeconds > 0) {
            return durationSeconds;
        }

        if (durationSeconds == null || durationSeconds <= 0) {
            return normalizedProgressSeconds;
        }

        return Math.min(normalizedProgressSeconds, durationSeconds);
    }
}
