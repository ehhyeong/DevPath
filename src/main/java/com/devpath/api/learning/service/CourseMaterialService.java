package com.devpath.api.learning.service;

import com.devpath.api.learning.dto.CourseMaterialResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.repository.CourseMaterialRepository;
import com.devpath.domain.course.repository.LessonRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CourseMaterialService {

    private final CourseMaterialRepository courseMaterialRepository;
    private final LessonRepository lessonRepository;

    // 특정 레슨의 학습자료 메타 목록을 표시 순서대로 조회한다.
    @Transactional(readOnly = true)
    public List<CourseMaterialResponse> getMaterials(Long lessonId) {
        lessonRepository.findById(lessonId)
                .orElseThrow(() -> new CustomException(ErrorCode.LESSON_NOT_FOUND));

        return courseMaterialRepository
                .findAllByLessonLessonIdOrderByDisplayOrderAsc(lessonId)
                .stream()
                .map(CourseMaterialResponse::from)
                .collect(Collectors.toList());
    }
}
