package com.devpath.common.provider;

import com.devpath.api.learning.dto.TilPublishRequest;

public interface BlogPublishProvider {

    boolean supports(String platform);

    BlogPublishResult publish(String normalizedPlatform, TilPublishRequest request);
}
