package com.devpath.common.provider;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * EasyOCR 기반 Flask OCR 서버(localhost:5000)와 통신하는 Provider다.
 * 영상 프레임 이미지를 base64로 전달하면 추출된 텍스트와 신뢰도를 반환한다.
 *
 * Flask 서버 API:
 *   POST /ocr
 *   Request:  { "image": "<base64>" }
 *   Response: { "text": "...", "confidence": 0.95, "lines": ["...", "..."] }
 */
@Component
@RequiredArgsConstructor
public class OcrProvider {

    private final RestTemplate restTemplate;

    @Value("${ocr.server.url:http://localhost:5000}")
    private String ocrServerUrl;

    // base64 인코딩된 이미지를 Flask OCR 서버로 전송하고 OcrResult를 반환한다.
    public OcrResult extractText(String base64Image) {
        String url = ocrServerUrl + "/ocr";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, String> body = Map.of("image", base64Image);
        HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);

        ResponseEntity<OcrResult> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                request,
                OcrResult.class
        );

        return response.getBody() != null ? response.getBody() : OcrResult.empty();
    }

    // Flask OCR 서버 응답 매핑 DTO다.
    @Getter
    @NoArgsConstructor
    public static class OcrResult {

        // 전체 추출 텍스트 (줄바꿈 포함)
        private String text;

        // 평균 인식 신뢰도 (0.0 ~ 1.0)
        private Double confidence;

        // 줄 단위로 분리된 텍스트 목록
        private List<String> lines;

        // 빈 결과 생성 팩토리 메서드
        public static OcrResult empty() {
            OcrResult result = new OcrResult();
            result.text = "";
            result.confidence = 0.0;
            result.lines = List.of();
            return result;
        }
    }
}
