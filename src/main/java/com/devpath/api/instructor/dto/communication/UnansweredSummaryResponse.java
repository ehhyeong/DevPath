package com.devpath.api.instructor.dto.communication;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UnansweredSummaryResponse {

    private long unansweredQnaCount;
    private long unansweredReviewCount;
    private long totalUnansweredCount;
}