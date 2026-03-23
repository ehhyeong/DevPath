package com.devpath.common.provider;

import com.devpath.api.learning.dto.TilPublishRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
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
public class DevToBlogPublishProvider implements BlogPublishProvider {

    private final RestTemplate restTemplate;

    @Value("${blog.publish.providers.devto.api-url:https://dev.to/api/articles}")
    private String apiUrl;

    @Value("${blog.publish.providers.devto.api-key:}")
    private String apiKey;

    @Override
    public boolean supports(String platform) {
        return "DEVTO".equalsIgnoreCase(platform) || "DEV_TO".equalsIgnoreCase(platform);
    }

    @Override
    public BlogPublishResult publish(String normalizedPlatform, TilPublishRequest request) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "DEVTO_API_KEY가 설정되어 있지 않습니다.");
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            headers.set("api-key", apiKey);

            Map<String, Object> articlePayload = new LinkedHashMap<>();
            articlePayload.put("title", request.getTitle());
            articlePayload.put("published", !Boolean.TRUE.equals(request.getDraft()));
            articlePayload.put("body_markdown", request.getContent());
            articlePayload.put("description", summarizeDescription(request.getContent()));

            if (request.getTags() != null && !request.getTags().isEmpty()) {
                articlePayload.put("tags", request.getTags());
            }
            if (request.getThumbnailUrl() != null && !request.getThumbnailUrl().isBlank()) {
                articlePayload.put("main_image", request.getThumbnailUrl());
            }

            Map<String, Object> requestBody = Map.of("article", articlePayload);
            HttpEntity<Map<String, Object>> httpEntity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<DevToArticleResponse> response = restTemplate.exchange(
                    apiUrl,
                    HttpMethod.POST,
                    httpEntity,
                    DevToArticleResponse.class
            );

            DevToArticleResponse responseBody = response.getBody();
            if (responseBody == null || responseBody.getId() == null || responseBody.getUrl() == null) {
                throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "DEV.to 발행 응답이 비어 있습니다.");
            }

            return new BlogPublishResult(
                    normalizedPlatform,
                    true,
                    String.valueOf(responseBody.getId()),
                    responseBody.getUrl(),
                    Boolean.TRUE.equals(request.getDraft()),
                    LocalDateTime.now()
            );
        } catch (RestClientException e) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "DEV.to 발행 요청에 실패했습니다.");
        }
    }

    private String summarizeDescription(String content) {
        String normalized = content == null ? "" : content
                .replaceAll("`+", "")
                .replaceAll("#+", "")
                .replaceAll("\\*+", "")
                .replaceAll("\\[(.*?)]\\((.*?)\\)", "$1")
                .replaceAll("\\s+", " ")
                .trim();

        if (normalized.length() <= 160) {
            return normalized;
        }
        return normalized.substring(0, 157) + "...";
    }

    @Getter
    @NoArgsConstructor
    private static class DevToArticleResponse {
        private Long id;
        private String url;
    }
}
