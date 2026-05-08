package com.devpath.api.instructor.dto.qna;

import com.devpath.api.instructor.entity.QnaTemplate;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class QnaTemplateResponse {

  private Long id;
  private Long instructorId;
  private String title;
  private String content;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public static QnaTemplateResponse from(QnaTemplate template) {
    return QnaTemplateResponse.builder()
        .id(template.getId())
        .instructorId(template.getInstructorId())
        .title(template.getTitle())
        .content(template.getContent())
        .createdAt(template.getCreatedAt())
        .updatedAt(template.getUpdatedAt())
        .build();
  }
}
