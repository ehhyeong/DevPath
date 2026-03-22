package com.devpath.global.provider;

import com.devpath.api.learning.dto.BlogPublishRequest;
import com.devpath.api.learning.dto.BlogPublishResponse;
import com.devpath.domain.learning.entity.TilDraft;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.springframework.stereotype.Component;

@Component
public class MockBlogPublisherProvider implements BlogPublisherProvider {

    @Override
    public boolean supports(String platform) {
        return platform != null && platform.trim().equalsIgnoreCase("MOCK");
    }

    @Override
    public BlogPublishResponse.ProviderResult publish(TilDraft tilDraft, BlogPublishRequest.Publish request) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String externalPostId = "mock-post-" + tilDraft.getId() + "-" + timestamp;
        String publishedUrl = "https://mock.blog.devpath/posts/" + externalPostId;

        return BlogPublishResponse.ProviderResult.builder()
                .externalPostId(externalPostId)
                .publishedUrl(publishedUrl)
                .success(true)
                .message("MOCK 블로그 발행이 완료되었습니다.")
                .build();
    }
}
