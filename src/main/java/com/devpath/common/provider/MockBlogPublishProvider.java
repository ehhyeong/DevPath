package com.devpath.common.provider;

import com.devpath.api.learning.dto.TilPublishRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class MockBlogPublishProvider implements BlogPublishProvider {

    @Value("${blog.publish.allow-mock-provider:true}")
    private boolean allowMockProvider;

    @Override
    public boolean supports(String platform) {
        return "MOCK".equalsIgnoreCase(platform);
    }

    @Override
    public BlogPublishResult publish(String normalizedPlatform, TilPublishRequest request) {
        if (!allowMockProvider) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "MOCK 블로그 provider가 비활성화되어 있습니다.");
        }

        // 한글 주석: 실제 provider 테스트가 어려운 로컬/테스트 환경만 명시적으로 MOCK를 허용한다.
        String externalPostId = "mock-post-" + UUID.randomUUID().toString().substring(0, 8);
        String publishedUrl = "https://mock.blog.devpath/posts/" + externalPostId;

        return new BlogPublishResult(
                normalizedPlatform,
                true,
                externalPostId,
                publishedUrl,
                Boolean.TRUE.equals(request.getDraft()),
                LocalDateTime.now()
        );
    }
}
