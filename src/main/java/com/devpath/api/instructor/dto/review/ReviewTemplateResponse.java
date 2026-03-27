package com.devpath.api.instructor.dto.review;

import com.devpath.api.instructor.entity.ReviewTemplate;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ReviewTemplateResponse {

    private Long id;
    private Long instructorId;
    private String title;
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ReviewTemplateResponse from(ReviewTemplate template) {
        return ReviewTemplateResponse.builder()
                .id(template.getId())
                .instructorId(template.getInstructorId())
                .title(template.getTitle())
                .content(template.getContent())
                .createdAt(template.getCreatedAt())
                .updatedAt(template.getUpdatedAt())
                .build();
    }
}