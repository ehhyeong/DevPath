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

    // 타임스탬프 노트 저장
    @Transactional
    public TimestampNoteResponse createNote(Long userId, Long lessonId,
            TimestampNoteRequest.Create request) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new CustomException(ErrorCode.LESSON_NOT_FOUND));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        TimestampNote note = TimestampNote.builder()
                .user(user)
                .lesson(lesson)
                .timestampSecond(request.getTimestampSecond())
                .content(request.getContent())
                .build();

        return TimestampNoteResponse.from(timestampNoteRepository.save(note));
    }

    // 특정 레슨의 타임스탬프 노트 목록 조회 (타임스탬프 순)
    @Transactional(readOnly = true)
    public List<TimestampNoteResponse> getNotes(Long userId, Long lessonId) {
        return timestampNoteRepository
                .findByUserIdAndLessonLessonIdAndIsDeletedFalseOrderByTimestampSecondAsc(userId, lessonId)
                .stream()
                .map(TimestampNoteResponse::from)
                .collect(Collectors.toList());
    }

    // 타임스탬프 노트 수정
    @Transactional
    public TimestampNoteResponse updateNote(Long userId, Long lessonId, Long noteId,
            TimestampNoteRequest.Update request) {
        TimestampNote note = timestampNoteRepository
                .findByIdAndUserIdAndIsDeletedFalse(noteId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.TIMESTAMP_NOTE_NOT_FOUND));

        note.updateContent(request.getTimestampSecond(), request.getContent());

        return TimestampNoteResponse.from(note);
    }

    // 타임스탬프 노트 삭제 (soft delete)
    @Transactional
    public void deleteNote(Long userId, Long noteId) {
        TimestampNote note = timestampNoteRepository
                .findByIdAndUserIdAndIsDeletedFalse(noteId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.TIMESTAMP_NOTE_NOT_FOUND));

        note.delete();
    }
}
