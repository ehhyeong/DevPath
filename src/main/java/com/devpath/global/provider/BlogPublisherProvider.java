package com.devpath.global.provider;

import com.devpath.api.learning.dto.BlogPublishRequest;
import com.devpath.api.learning.dto.BlogPublishResponse;
import com.devpath.domain.learning.entity.TilDraft;

public interface BlogPublisherProvider {

    boolean supports(String platform);

    BlogPublishResponse.ProviderResult publish(TilDraft tilDraft, BlogPublishRequest.Publish request);
}
