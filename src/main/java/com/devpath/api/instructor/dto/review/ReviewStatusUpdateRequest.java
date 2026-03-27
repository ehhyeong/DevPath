package com.devpath.api.instructor.dto.review;

import com.devpath.api.review.entity.ReviewStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReviewStatusUpdateRequest {

    @NotNull
    private ReviewStatus status;
}