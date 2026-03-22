package com.devpath.api.learning.service;

import com.devpath.api.learning.dto.BlogPublishRequest;
import com.devpath.api.learning.dto.BlogPublishResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.TilDraft;
import com.devpath.domain.learning.repository.TilDraftRepository;
import com.devpath.global.provider.BlogPublisherProvider;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BlogPublishService {

    private final TilDraftRepository tilDraftRepository;
    private final List<BlogPublisherProvider> blogPublisherProviders;

    @Transactional
    public BlogPublishResponse.Publish publish(Long userId, Long tilId, BlogPublishRequest.Publish request) {
        TilDraft tilDraft = tilDraftRepository.findByIdAndUserIdAndIsDeletedFalse(tilId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.TIL_NOT_FOUND));

        BlogPublisherProvider provider = getProvider(request.getPlatform());

        String resolvedTitle = isBlank(request.getTitle()) ? tilDraft.getTitle() : request.getTitle().trim();
        String resolvedContent = isBlank(request.getContent()) ? tilDraft.getContent() : request.getContent().trim();

        BlogPublishRequest.Publish payload = copyRequest(
                request,
                resolvedTitle,
                resolvedContent
        );

        BlogPublishResponse.ProviderResult providerResult = provider.publish(tilDraft, payload);

        if (Boolean.TRUE.equals(providerResult.getSuccess())) {
            tilDraft.publish(providerResult.getPublishedUrl());
        }

        return BlogPublishResponse.of(
                tilDraft,
                normalizePlatform(request.getPlatform()),
                resolvedTitle,
                providerResult
        );
    }

    private BlogPublisherProvider getProvider(String platform) {
        String normalizedPlatform = normalizePlatform(platform);

        return blogPublisherProviders.stream()
                .filter(provider -> provider.supports(normalizedPlatform))
                .findFirst()
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_INPUT, "지원하지 않는 블로그 플랫폼입니다."));
    }

    private BlogPublishRequest.Publish copyRequest(
            BlogPublishRequest.Publish request,
            String resolvedTitle,
            String resolvedContent
    ) {
        return new PublishPayloadAdapter(
                normalizePlatform(request.getPlatform()),
                resolvedTitle,
                resolvedContent,
                request.getTags(),
                request.getDraft(),
                request.getThumbnailUrl()
        );
    }

    private String normalizePlatform(String platform) {
        return platform == null ? "" : platform.trim().toUpperCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static class PublishPayloadAdapter extends BlogPublishRequest.Publish {

        private final String platform;
        private final String title;
        private final String content;
        private final String tags;
        private final Boolean draft;
        private final String thumbnailUrl;

        private PublishPayloadAdapter(
                String platform,
                String title,
                String content,
                String tags,
                Boolean draft,
                String thumbnailUrl
        ) {
            this.platform = platform;
            this.title = title;
            this.content = content;
            this.tags = tags;
            this.draft = draft;
            this.thumbnailUrl = thumbnailUrl;
        }

        @Override
        public String getPlatform() {
            return platform;
        }

        @Override
        public String getTitle() {
            return title;
        }

        @Override
        public String getContent() {
            return content;
        }

        @Override
        public String getTags() {
            return tags;
        }

        @Override
        public Boolean getDraft() {
            return draft;
        }

        @Override
        public String getThumbnailUrl() {
            return thumbnailUrl;
        }
    }
}
