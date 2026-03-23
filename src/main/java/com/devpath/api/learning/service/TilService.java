package com.devpath.api.learning.service;

import com.devpath.api.learning.dto.TilPublishRequest;
import com.devpath.api.learning.dto.TilPublishResponse;
import com.devpath.api.learning.dto.TilRequest;
import com.devpath.api.learning.dto.TilResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.common.provider.BlogPublishProvider;
import com.devpath.common.provider.BlogPublishResult;
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
import java.util.Locale;
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
    private final List<BlogPublishProvider> blogPublishProviders;

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

    @Transactional(readOnly = true)
    public TilResponse getTil(Long userId, Long tilId) {
        TilDraft til = tilDraftRepository.findByIdAndUserIdAndIsDeletedFalse(tilId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.TIL_NOT_FOUND));

        return TilResponse.from(til);
    }

    @Transactional(readOnly = true)
    public List<TilResponse> getTilList(Long userId) {
        return tilDraftRepository.findByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(userId)
                .stream()
                .map(TilResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public TilResponse updateTil(Long userId, Long tilId, TilRequest.Update request) {
        TilDraft til = tilDraftRepository.findByIdAndUserIdAndIsDeletedFalse(tilId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.TIL_NOT_FOUND));

        til.updateContent(request.getTitle(), request.getContent());
        return TilResponse.from(til);
    }

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

        String content = notes.stream()
                .map(note -> {
                    int second = note.getTimestampSecond();
                    String timestamp = String.format("%02d:%02d", second / 60, second % 60);
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

    @Transactional
    public TilPublishResponse publishToExternalBlog(Long userId, Long tilId, TilPublishRequest request) {
        TilDraft til = tilDraftRepository.findByIdAndUserIdAndIsDeletedFalse(tilId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.TIL_NOT_FOUND));

        til.updateContent(request.getTitle(), request.getContent());

        String normalizedPlatform = normalizePlatform(request.getPlatform());
        BlogPublishProvider provider = findBlogPublishProvider(normalizedPlatform);
        BlogPublishResult publishResult = provider.publish(normalizedPlatform, request);
        til.publish(publishResult.publishedUrl());

        return TilPublishResponse.builder()
                .tilId(til.getId())
                .published(publishResult.published())
                .platform(publishResult.platform())
                .externalPostId(publishResult.externalPostId())
                .publishedUrl(publishResult.publishedUrl())
                .draft(publishResult.draft())
                .publishedAt(publishResult.publishedAt())
                .build();
    }

    @Transactional
    public TilResponse generateTableOfContents(Long userId, Long tilId) {
        TilDraft til = tilDraftRepository.findByIdAndUserIdAndIsDeletedFalse(tilId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.TIL_NOT_FOUND));

        String toc = buildTableOfContents(til.getContent());
        til.updateTableOfContents(toc);

        return TilResponse.from(til);
    }

    private BlogPublishProvider findBlogPublishProvider(String normalizedPlatform) {
        return blogPublishProviders.stream()
                .filter(provider -> provider.supports(normalizedPlatform))
                .findFirst()
                .orElseThrow(() -> new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "지원하지 않는 블로그 플랫폼입니다."));
    }

    private String buildTableOfContents(String content) {
        Pattern pattern = Pattern.compile("^(#{1,3})\\s+(.+)$", Pattern.MULTILINE);
        Matcher matcher = pattern.matcher(content);
        List<String> entries = new ArrayList<>();

        while (matcher.find()) {
            int level = matcher.group(1).length();
            String title = matcher.group(2).trim();
            String anchor = title.toLowerCase()
                    .replaceAll("[^a-z0-9가-힣\\s]", "")
                    .trim()
                    .replaceAll("\\s+", "-");

            entries.add(String.format(
                    "{\"level\":%d,\"title\":\"%s\",\"anchor\":\"%s\"}",
                    level,
                    title,
                    anchor
            ));
        }

        return "[" + String.join(",", entries) + "]";
    }

    private String normalizePlatform(String platform) {
        return platform.trim().toUpperCase(Locale.ROOT);
    }
}
