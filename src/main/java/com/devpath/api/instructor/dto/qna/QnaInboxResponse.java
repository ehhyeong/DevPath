package com.devpath.api.instructor.dto.qna;

import com.devpath.domain.qna.entity.QnaStatus;
import com.devpath.domain.qna.entity.Question;
import java.time.LocalDateTime;

public record QnaInboxResponse(
    Long questionId,
    Long courseId,
    Long lessonId,
    Long learnerId,
    String courseTitle,
    String lessonTitle,
    String learnerName,
    String learnerAvatarSeed,
    String learnerProfileImage,
    String title,
    String content,
    QnaStatus status,
    String lectureTimestamp,
    LocalDateTime createdAt) {

  public static QnaInboxResponse from(Question question) {
    return from(question, null, null);
  }

  public static QnaInboxResponse from(Question question, String courseTitle) {
    return from(question, courseTitle, null, question.getQnaStatus());
  }

  public static QnaInboxResponse from(Question question, String courseTitle, String lessonTitle) {
    return from(question, courseTitle, lessonTitle, question.getQnaStatus());
  }

  public static QnaInboxResponse from(
      Question question, String courseTitle, String lessonTitle, QnaStatus status) {
    return from(question, courseTitle, question.getLessonId(), lessonTitle, status);
  }

  public static QnaInboxResponse from(
      Question question, String courseTitle, Long lessonId, String lessonTitle, QnaStatus status) {
    return from(question, courseTitle, lessonId, lessonTitle, status, null);
  }

  public static QnaInboxResponse from(
      Question question,
      String courseTitle,
      Long lessonId,
      String lessonTitle,
      QnaStatus status,
      String learnerProfileImage) {
    Long learnerId = question.getUser() == null ? null : question.getUser().getId();
    String learnerName = question.getUser() == null ? null : question.getUser().getName();
    return new QnaInboxResponse(
        question.getId(),
        question.getCourseId(),
        lessonId,
        learnerId,
        courseTitle,
        lessonTitle,
        learnerName,
        learnerName,
        learnerProfileImage,
        question.getTitle(),
        question.getContent(),
        status,
        question.getLectureTimestamp(),
        question.getCreatedAt());
  }
}
