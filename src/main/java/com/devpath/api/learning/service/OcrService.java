package com.devpath.api.learning.service;

import com.devpath.api.learning.dto.OcrRequest;
import com.devpath.api.learning.dto.OcrResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.common.provider.OcrProvider;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.learning.entity.ocr.OcrResult;
import com.devpath.domain.learning.repository.ocr.OcrResultRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OcrService {

    private final OcrResultRepository ocrResultRepository;
    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;
    private final OcrProvider ocrProvider;

    @Value("${ocr.allow-source-text-fallback:true}")
    private boolean allowSourceTextFallback;

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

        try {
            OcrProvider.OcrResult providerResult = ocrProvider.extractTextFromImageUrl(request.getSourceImageUrl());
            applyProviderResult(ocrResult, request, providerResult);
        } catch (CustomException e) {
            if (canUseHintFallback(request)) {
                applyHintFallback(ocrResult, request);
            } else {
                ocrResult.markFailed();
                ocrResultRepository.save(ocrResult);
                throw e;
            }
        }

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
            throw new CustomException(ErrorCode.INVALID_INPUT, "검색어는 비워 둘 수 없습니다.");
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

    private void applyProviderResult(OcrResult ocrResult, OcrRequest.Extract request, OcrProvider.OcrResult providerResult) {
        String extractedText = resolveExtractedText(providerResult);
        if (extractedText.isBlank()) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "OCR 서버가 빈 텍스트를 반환했습니다.");
        }

        ocrResult.markCompleted(
                extractedText,
                normalize(extractedText),
                buildTimestampMappings(request.getFrameTimestampSecond(), providerResult.getLines(), extractedText),
                providerResult.getConfidence() == null ? 0.0D : providerResult.getConfidence()
        );
    }

    private boolean canUseHintFallback(OcrRequest.Extract request) {
        return allowSourceTextFallback
                && request.getSourceTextHint() != null
                && !request.getSourceTextHint().isBlank();
    }

    private void applyHintFallback(OcrResult ocrResult, OcrRequest.Extract request) {
        // 한글 주석: 외부 OCR 서버가 실패한 경우에만 명시적 힌트 텍스트를 fallback으로 쓴다.
        String extractedText = request.getSourceTextHint().trim();
        ocrResult.markCompleted(
                extractedText,
                normalize(extractedText),
                buildTimestampMappings(request.getFrameTimestampSecond(), List.of(extractedText), extractedText),
                0.97D
        );
    }

    private String resolveExtractedText(OcrProvider.OcrResult providerResult) {
        if (providerResult.getText() != null && !providerResult.getText().isBlank()) {
            return providerResult.getText().trim();
        }
        if (providerResult.getLines() != null && !providerResult.getLines().isEmpty()) {
            return providerResult.getLines().stream()
                    .filter(line -> line != null && !line.isBlank())
                    .map(String::trim)
                    .reduce((left, right) -> left + "\n" + right)
                    .orElse("");
        }
        return "";
    }

    private String normalize(String value) {
        return value == null
                ? ""
                : value.trim()
                        .replaceAll("\\s+", " ")
                        .toLowerCase(Locale.ROOT);
    }

    private String buildTimestampMappings(Integer frameTimestampSecond, List<String> lines, String extractedText) {
        List<String> mappingLines = (lines == null || lines.isEmpty()) ? List.of(extractedText) : lines;
        StringBuilder builder = new StringBuilder("[");

        for (int index = 0; index < mappingLines.size(); index++) {
            if (index > 0) {
                builder.append(",");
            }
            builder.append("{\"second\":")
                    .append(frameTimestampSecond)
                    .append(",\"text\":\"")
                    .append(escapeJson(mappingLines.get(index)))
                    .append("\"}");
        }

        builder.append("]");
        return builder.toString();
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
