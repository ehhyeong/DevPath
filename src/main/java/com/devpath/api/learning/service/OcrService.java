package com.devpath.api.learning.service;

import com.devpath.api.learning.dto.OcrRequest;
import com.devpath.api.learning.dto.OcrResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.learning.entity.ocr.OcrResult;
import com.devpath.domain.learning.repository.ocr.OcrResultRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OcrService {

    private final OcrResultRepository ocrResultRepository;
    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;

    // This phase persists a mock OCR result so the API contract can stabilize first.
    @Transactional
    public OcrResponse.Detail extractText(Long userId, Long lessonId, OcrRequest.Extract request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new CustomException(ErrorCode.LESSON_NOT_FOUND));

        OcrResult ocrResult = OcrResult.builder()
                .user(user)
                .lesson(lesson)
                .frameTimestampSecond(request.getFrameTimestampSecond())
                .sourceImageUrl(request.getSourceImageUrl())
                .status("REQUESTED")
                .build();

        String extractedText = buildMockExtractedText(lesson, request);
        String searchableNormalizedText = normalize(extractedText);
        String timestampMappings = buildTimestampMappings(request.getFrameTimestampSecond(), extractedText);
        Double confidence = 0.97D;

        ocrResult.markCompleted(
                extractedText,
                searchableNormalizedText,
                timestampMappings,
                confidence
        );

        OcrResult saved = ocrResultRepository.save(ocrResult);
        return OcrResponse.Detail.from(saved);
    }

    @Transactional(readOnly = true)
    public OcrResponse.Detail getOcrResult(Long userId, Long ocrId) {
        OcrResult ocrResult = ocrResultRepository.findByIdAndUserId(ocrId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "OCR 결과를 찾을 수 없습니다."));

        return OcrResponse.Detail.from(ocrResult);
    }

    @Transactional(readOnly = true)
    public OcrResponse.SearchResult searchOcrText(Long userId, Long lessonId, String keyword) {
        lessonRepository.findById(lessonId)
                .orElseThrow(() -> new CustomException(ErrorCode.LESSON_NOT_FOUND));

        if (keyword == null || keyword.isBlank()) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "검색어는 비어 있을 수 없습니다.");
        }

        List<OcrResult> results = ocrResultRepository
                .findAllByUserIdAndLessonLessonIdAndSearchableNormalizedTextContainingOrderByFrameTimestampSecondAsc(
                        userId,
                        lessonId,
                        normalize(keyword)
                );

        return OcrResponse.SearchResult.of(lessonId, keyword, results);
    }

    @Transactional(readOnly = true)
    public OcrResponse.MappingResult getTimestampMappings(Long userId, Long lessonId) {
        lessonRepository.findById(lessonId)
                .orElseThrow(() -> new CustomException(ErrorCode.LESSON_NOT_FOUND));

        List<OcrResult> results = ocrResultRepository
                .findAllByUserIdAndLessonLessonIdOrderByFrameTimestampSecondAsc(userId, lessonId);

        return OcrResponse.MappingResult.of(lessonId, results);
    }

    private String buildMockExtractedText(Lesson lesson, OcrRequest.Extract request) {
        if (request.getSourceTextHint() != null && !request.getSourceTextHint().isBlank()) {
            return request.getSourceTextHint().trim();
        }

        return lesson.getTitle() + " 화면에서 추출된 OCR 텍스트입니다.";
    }

    private String normalize(String value) {
        return value == null
                ? ""
                : value.trim()
                        .replaceAll("\\s+", " ")
                        .toLowerCase(Locale.ROOT);
    }

    private String buildTimestampMappings(Integer frameTimestampSecond, String extractedText) {
        // A compact JSON string is enough until mappings need richer querying.
        return "[{\"second\":" + frameTimestampSecond + ",\"text\":\"" + escapeJson(extractedText) + "\"}]";
    }

    private String escapeJson(String value) {
        if (value == null) {
            return "";
        }

        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", " ")
                .replace("\r", " ");
    }
}
