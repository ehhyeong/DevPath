package com.devpath.common.provider;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Component
@RequiredArgsConstructor
public class OcrProvider {

    private final RestTemplate restTemplate;

    @Value("${ocr.server.url:http://localhost:5000}")
    private String ocrServerUrl;

    public OcrResult extractTextFromImageUrl(String sourceImageUrl) {
        byte[] imageBytes = downloadImage(sourceImageUrl);
        String base64Image = Base64.getEncoder().encodeToString(imageBytes);
        return extractText(base64Image);
    }

    public OcrResult extractText(String base64Image) {
        try {
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
        } catch (RestClientException e) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "OCR 서버 호출에 실패했습니다.");
        }
    }

    private byte[] downloadImage(String sourceImageUrl) {
        try {
            ResponseEntity<byte[]> response = restTemplate.getForEntity(sourceImageUrl, byte[].class);
            byte[] imageBytes = response.getBody();

            if (imageBytes == null || imageBytes.length == 0) {
                throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "OCR 대상 이미지를 내려받지 못했습니다.");
            }
            return imageBytes;
        } catch (RestClientException e) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "OCR 대상 이미지를 내려받는 데 실패했습니다.");
        }
    }

    @Getter
    @NoArgsConstructor
    public static class OcrResult {

        private String text;
        private Double confidence;
        private List<String> lines;

        // 한글 주석: provider 응답이 비어 있어도 서비스 단에서 후처리할 수 있게 기본 객체를 만든다.
        public static OcrResult empty() {
            OcrResult result = new OcrResult();
            result.text = "";
            result.confidence = 0.0;
            result.lines = List.of();
            return result;
        }
    }
}
