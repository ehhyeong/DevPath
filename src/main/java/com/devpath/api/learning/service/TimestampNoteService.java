package com.devpath.api.learning.service;

import com.devpath.api.learning.dto.TimestampNoteRequest;
import com.devpath.api.learning.dto.TimestampNoteResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.learning.entity.TimestampNote;
import com.devpath.domain.learning.repository.TimestampNoteRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TimestampNoteService {

    private final TimestampNoteRepository timestampNoteRepository;
    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;

    @Transactional
    public TimestampNoteResponse createNote(Long userId, Long lessonId, TimestampNoteRequest.Create request) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new CustomException(ErrorCode.LESSON_NOT_FOUND));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        TimestampNote note = TimestampNote.builder()
                .user(user)
                .lesson(lesson)
                .timestampSecond(resolveTimestampSecond(request.getTimestampSecond(), request.getTimestampText()))
                .content(request.getContent())
                .build();

        return TimestampNoteResponse.from(timestampNoteRepository.save(note));
    }

    @Transactional(readOnly = true)
    public List<TimestampNoteResponse> getNotes(Long userId, Long lessonId) {
        return timestampNoteRepository
                .findByUserIdAndLessonLessonIdAndIsDeletedFalseOrderByTimestampSecondAsc(userId, lessonId)
                .stream()
                .map(TimestampNoteResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public TimestampNoteResponse updateNote(Long userId, Long lessonId, Long noteId, TimestampNoteRequest.Update request) {
        TimestampNote note = timestampNoteRepository
                .findByIdAndUserIdAndIsDeletedFalse(noteId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.TIMESTAMP_NOTE_NOT_FOUND));

        validateLessonScope(note, lessonId);

        note.updateContent(
                resolveTimestampSecond(request.getTimestampSecond(), request.getTimestampText()),
                request.getContent()
        );

        return TimestampNoteResponse.from(note);
    }

    @Transactional
    public void deleteNote(Long userId, Long lessonId, Long noteId) {
        TimestampNote note = timestampNoteRepository
                .findByIdAndUserIdAndIsDeletedFalse(noteId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.TIMESTAMP_NOTE_NOT_FOUND));

        // 한글 주석: 삭제도 수정과 동일하게 lessonId 범위를 검증해 path semantics를 맞춘다.
        validateLessonScope(note, lessonId);
        note.delete();
    }

    private void validateLessonScope(TimestampNote note, Long lessonId) {
        if (!note.getLesson().getLessonId().equals(lessonId)) {
            throw new CustomException(ErrorCode.TIMESTAMP_NOTE_NOT_FOUND);
        }
    }

    private Integer resolveTimestampSecond(Integer timestampSecond, String timestampText) {
        if (timestampText != null && !timestampText.isBlank()) {
            return parseTimestampText(timestampText);
        }
        return normalizeTimestampSecond(timestampSecond);
    }

    private Integer normalizeTimestampSecond(Integer timestampSecond) {
        if (timestampSecond == null || timestampSecond < 0) {
            return 0;
        }
        return timestampSecond;
    }

    private Integer parseTimestampText(String timestampText) {
        String normalizedText = timestampText == null ? "" : timestampText.trim();

        if (normalizedText.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "타임스탬프 문자열이 비어 있습니다.");
        }

        if (normalizedText.matches("\\d+")) {
            return normalizeTimestampSecond(Integer.parseInt(normalizedText));
        }

        String[] parts = normalizedText.split(":");
        if (parts.length != 2 && parts.length != 3) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "타임스탬프 형식은 초, mm:ss, hh:mm:ss 중 하나여야 합니다.");
        }

        int totalSeconds = 0;
        for (int index = 0; index < parts.length; index++) {
            String part = parts[index].trim();
            if (!part.matches("\\d+")) {
                throw new CustomException(ErrorCode.INVALID_INPUT, "타임스탬프에는 숫자만 사용할 수 있습니다.");
            }

            int value = Integer.parseInt(part);
            if (index > 0 && value >= 60) {
                throw new CustomException(ErrorCode.INVALID_INPUT, "분과 초는 60 미만이어야 합니다.");
            }

            totalSeconds = (totalSeconds * 60) + value;
        }

        return normalizeTimestampSecond(totalSeconds);
    }
}
