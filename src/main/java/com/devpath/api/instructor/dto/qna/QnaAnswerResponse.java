package com.devpath.api.instructor.dto.qna;

import com.devpath.domain.qna.entity.Answer;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class QnaAnswerResponse {

  private Long answerId;
  private Long questionId;
  private Long instructorId;
  private String authorName;
  private String authorProfileImage;
  private String content;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public static QnaAnswerResponse from(
      Answer answer, String authorName, String authorProfileImage) {
    return QnaAnswerResponse.builder()
        .answerId(answer.getId())
        .questionId(answer.getQuestion().getId())
        .instructorId(answer.getUser().getId())
        .authorName(authorName)
        .authorProfileImage(authorProfileImage)
        .content(answer.getContent())
        .createdAt(answer.getCreatedAt())
        .updatedAt(answer.getUpdatedAt())
        .build();
  }
}
