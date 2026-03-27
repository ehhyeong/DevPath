package com.devpath.api.instructor.dto.review;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ReviewHelpfulResponse {

    private long totalReviews;
    private long answeredCount;
    private long unansweredCount;
    private long unsatisfiedCount;
    private double answerRate;
}