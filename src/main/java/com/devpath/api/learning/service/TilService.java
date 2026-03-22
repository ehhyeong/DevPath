package com.devpath.api.learning.service;

import com.devpath.api.learning.dto.TilRequest;
import com.devpath.api.learning.dto.TilResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.learning.entity.TilDraft;
import com.devpath.domain.learning.entity.TimestampNote;
import com.devpath.domain.learning.repository.TilDraftRepository;
import com.devpath.domain.learning.repository.TimestampNoteRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TilService {

    private final TilDraftRepository tilDraftRepository;
    private final TimestampNoteRepository timestampNoteRepository;
    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;

    // TIL 초안 저장
    @Transactional
    public TilResponse createTil(Long userId, TilRequest.Create request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Lesson lesson = null;
        if (request.getLessonId() != null) {
            lesson = lessonRepository.findById(request.getLessonId())
                    .orElseThrow(() -> new CustomException(ErrorCode.LESSON_NOT_FOUND));
        }

        TilDraft til = TilDraft.builder()
                .user(user)
                .lesson(lesson)
                .title(request.getTitle())
                .content(request.getContent())
                .build();

        return TilResponse.from(tilDraftRepository.save(til));
    }

    // TIL 단건 조회
    @Transactional(readOnly = true)
    public TilResponse getTil(Long userId, Long tilId) {
        TilDraft til = tilDraftRepository.findByIdAndUserIdAndIsDeletedFalse(tilId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.TIL_NOT_FOUND));
        return TilResponse.from(til);
    }

    // TIL 목록 조회
    @Transactional(readOnly = true)
    public List<TilResponse> getTilList(Long userId) {
        return tilDraftRepository.findByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(userId)
                .stream()
                .map(TilResponse::from)
                .collect(Collectors.toList());
    }

    // TIL 수정
    @Transactional
    public TilResponse updateTil(Long userId, Long tilId, TilRequest.Update request) {
        TilDraft til = tilDraftRepository.findByIdAndUserIdAndIsDeletedFalse(tilId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.TIL_NOT_FOUND));

        til.updateContent(request.getTitle(), request.getContent());
        return TilResponse.from(til);
    }

    // 노트 목록 → TIL 초안 자동 변환
    // 타임스탬프 순으로 정렬 후 노트 내용을 마크다운으로 이어 붙여 TIL 본문을 생성한다.
    @Transactional
    public TilResponse convertFromNotes(Long userId, TilRequest.ConvertFromNotes request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Lesson lesson = null;
        if (request.getLessonId() != null) {
            lesson = lessonRepository.findById(request.getLessonId())
                    .orElseThrow(() -> new CustomException(ErrorCode.LESSON_NOT_FOUND));
        }

        List<TimestampNote> notes = request.getNoteIds().stream()
                .map(noteId -> timestampNoteRepository.findByIdAndUserIdAndIsDeletedFalse(noteId, userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.TIMESTAMP_NOTE_NOT_FOUND)))
                .sorted(Comparator.comparingInt(TimestampNote::getTimestampSecond))
                .collect(Collectors.toList());

        // 타임스탬프를 mm:ss 형식으로 변환하여 마크다운 본문 구성
        String content = notes.stream()
                .map(note -> {
                    int sec = note.getTimestampSecond();
                    String timestamp = String.format("%02d:%02d", sec / 60, sec % 60);
                    return "## [" + timestamp + "]\n" + note.getContent();
                })
                .collect(Collectors.joining("\n\n"));

        TilDraft til = TilDraft.builder()
                .user(user)
                .lesson(lesson)
                .title(request.getTitle())
                .content(content)
                .build();

        return TilResponse.from(tilDraftRepository.save(til));
    }

    // 외부 블로그 발행 (stub)
    // 실제 외부 블로그 API 연동은 추후 구현 예정이며, 현재는 발행 상태와 URL만 업데이트한다.
    @Transactional
    public TilResponse publishToExternalBlog(Long userId, Long tilId) {
        TilDraft til = tilDraftRepository.findByIdAndUserIdAndIsDeletedFalse(tilId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.TIL_NOT_FOUND));

        // stub: 실제 발행 대신 상태를 PUBLISHED로 변경하고 임시 URL을 생성한다.
        String stubUrl = "https://devpath.blog/" + userId + "/til/" + tilId;
        til.publish(stubUrl);

        return TilResponse.from(til);
    }

    // TIL 본문의 마크다운 헤더(#, ##, ###)를 파싱하여 목차 JSON 문자열을 생성하고 저장한다.
    // 목차 형식: [{"level":1,"title":"제목","anchor":"제목"},...]
    @Transactional
    public TilResponse generateTableOfContents(Long userId, Long tilId) {
        TilDraft til = tilDraftRepository.findByIdAndUserIdAndIsDeletedFalse(tilId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.TIL_NOT_FOUND));

        String toc = buildTableOfContents(til.getContent());
        til.updateTableOfContents(toc);

        return TilResponse.from(til);
    }

    // 마크다운 헤더 파싱 후 JSON 배열 문자열로 반환하는 내부 유틸 메서드
    private String buildTableOfContents(String content) {
        Pattern pattern = Pattern.compile("^(#{1,3})\\s+(.+)$", Pattern.MULTILINE);
        Matcher matcher = pattern.matcher(content);

        List<String> entries = new ArrayList<>();
        while (matcher.find()) {
            int level = matcher.group(1).length();
            String title = matcher.group(2).trim();
            String anchor = title.toLowerCase().replaceAll("[^a-z0-9가-힣\\s]", "").trim().replaceAll("\\s+", "-");
            entries.add(String.format("{\"level\":%d,\"title\":\"%s\",\"anchor\":\"%s\"}", level, title, anchor));
        }

        return "[" + String.join(",", entries) + "]";
    }
}
