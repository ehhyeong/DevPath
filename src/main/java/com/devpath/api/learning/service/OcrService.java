package com.devpath.api.learning.service;

import com.devpath.api.learning.dto.OcrResultResponse;
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
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OcrService {

    private final OcrResultRepository ocrResultRepository;
    private final OcrProvider ocrProvider;
    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;

    // base64 인코딩된 영상 프레임 이미지를 Flask OCR 서버로 전송하고 결과를 DB에 저장한다.
    @Transactional
    public OcrResultResponse extractAndSave(Long userId, Long lessonId,
            Integer frameTimestampSecond, String base64Image) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new CustomException(ErrorCode.LESSON_NOT_FOUND));

        // Flask OCR 서버 호출
        OcrProvider.OcrResult ocrResult = ocrProvider.extractText(base64Image);

        OcrResult entity = OcrResult.builder()
                .user(user)
                .lesson(lesson)
                .frameTimestampSecond(frameTimestampSecond)
                .extractedText(ocrResult.getText())
                .confidence(ocrResult.getConfidence())
                .build();

        return OcrResultResponse.from(ocrResultRepository.save(entity));
    }

    // 특정 레슨의 OCR 결과를 타임스탬프 순으로 조회한다.
    @Transactional(readOnly = true)
    public List<OcrResultResponse> getOcrResults(Long userId, Long lessonId) {
        lessonRepository.findById(lessonId)
                .orElseThrow(() -> new CustomException(ErrorCode.LESSON_NOT_FOUND));

        return ocrResultRepository
                .findByUserIdAndLessonLessonIdOrderByFrameTimestampSecondAsc(userId, lessonId)
                .stream()
                .map(OcrResultResponse::from)
                .collect(Collectors.toList());
    }

    // 특정 OCR 결과 단건을 조회한다.
    @Transactional(readOnly = true)
    public OcrResultResponse getOcrResult(Long userId, Long ocrId) {
        OcrResult result = ocrResultRepository.findById(ocrId)
                .orElseThrow(() -> new CustomException(ErrorCode.OCR_RESULT_NOT_FOUND));

        if (!result.getUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }

        return OcrResultResponse.from(result);
    }
}
