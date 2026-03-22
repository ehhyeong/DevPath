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

    @Transactional
    public LessonProgressResponse getProgress(Long userId, Long lessonId) {
        LessonProgress progress = getOrCreateLessonProgress(userId, lessonId);
        return LessonProgressResponse.from(progress);
    }

    private LessonProgress getOrCreateLessonProgress(Long userId, Long lessonId) {
        return findLessonProgress(userId, lessonId)
                .orElseGet(() -> createLessonProgress(userId, lessonId));
    }

    private Optional<LessonProgress> findLessonProgress(Long userId, Long lessonId) {
        return lessonProgressRepository.findByUserIdAndLessonLessonId(userId, lessonId);
    }

    private LessonProgress createLessonProgress(Long userId, Long lessonId) {
        // 한글 주석: 최초 조회에서도 기본 progress 레코드를 만들 수 있어 쓰기 트랜잭션으로 분리한다.
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
