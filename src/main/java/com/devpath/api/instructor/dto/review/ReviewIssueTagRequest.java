package com.devpath.api.instructor.dto.review;

import jakarta.validation.constraints.NotEmpty;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReviewIssueTagRequest {

    @NotEmpty
    private List<String> issueTags;
}