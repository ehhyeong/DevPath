package com.devpath.domain.qna.entity;

import com.devpath.domain.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;

@Entity
@Table(name = "qna_questions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Question {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "question_id")
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Enumerated(EnumType.STRING)
  @Column(name = "template_type", nullable = false, length = 50)
  private QuestionTemplateType templateType;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private QuestionDifficulty difficulty;

  @Column(nullable = false, length = 255)
  private String title;

  @Column(columnDefinition = "TEXT", nullable = false)
  private String content;

  @Column(name = "adopted_answer_id")
  private Long adoptedAnswerId;

  @Column(name = "course_id")
  private Long courseId;

  @Column(name = "lesson_id")
  private Long lessonId;

  @Column(name = "lecture_timestamp", length = 20)
  private String lectureTimestamp;

  @Enumerated(EnumType.STRING)
  @Column(name = "question_scope", nullable = false, length = 30)
  @ColumnDefault("'COURSE'")
  private QuestionScope questionScope = QuestionScope.COURSE;

  @Column(name = "mentoring_id")
  private Long mentoringId;

  @Column(name = "workspace_id")
  private Long workspaceId;

  @Enumerated(EnumType.STRING)
  @Column(name = "qna_status", nullable = false, length = 20)
  private QnaStatus qnaStatus = QnaStatus.UNANSWERED;

  @Column(name = "view_count", nullable = false)
  private int viewCount;

  @Column(name = "is_deleted", nullable = false)
  private boolean isDeleted;

  @Column(name = "created_at", updatable = false, nullable = false)
  private LocalDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @Builder
  public Question(
      User user,
      QuestionTemplateType templateType,
      QuestionDifficulty difficulty,
      String title,
      String content,
      Long courseId,
      Long lessonId,
      String lectureTimestamp) {
    this.user = user;
    this.templateType = templateType;
    this.difficulty = difficulty;
    this.title = title;
    this.content = content;
    this.courseId = courseId;
    this.lessonId = lessonId;
    this.lectureTimestamp = lectureTimestamp;
    this.questionScope = QuestionScope.COURSE;
    this.qnaStatus = QnaStatus.UNANSWERED;
    this.adoptedAnswerId = null;
    this.viewCount = 0;
    this.isDeleted = false;
    this.createdAt = LocalDateTime.now();
    this.updatedAt = LocalDateTime.now();
  }

  public void incrementViewCount() {
    this.viewCount++;
  }

  public boolean hasAdoptedAnswer() {
    return this.adoptedAnswerId != null;
  }

  public void adoptAnswer(Long answerId) {
    this.adoptedAnswerId = answerId;
    this.updatedAt = LocalDateTime.now();
  }

  public void deleteQuestion() {
    this.isDeleted = true;
    this.updatedAt = LocalDateTime.now();
  }

  public void updateQnaStatus(QnaStatus status) {
    this.qnaStatus = status;
    this.updatedAt = LocalDateTime.now();
  }

  public void markAsAnswered() {
    this.qnaStatus = QnaStatus.ANSWERED;
    this.updatedAt = LocalDateTime.now();
  }

  public void attachMentoring(Long mentoringId) {
    this.questionScope = QuestionScope.MENTORING;
    this.mentoringId = mentoringId;
    this.workspaceId = null;
    this.updatedAt = LocalDateTime.now();
  }

  public void attachWorkspace(Long workspaceId) {
    this.questionScope = QuestionScope.WORKSPACE;
    this.workspaceId = workspaceId;
    this.mentoringId = null;
    this.updatedAt = LocalDateTime.now();
  }

  public boolean isMentoringQuestion() {
    return this.questionScope == QuestionScope.MENTORING;
  }

  public boolean isWorkspaceQuestion() {
    return this.questionScope == QuestionScope.WORKSPACE;
  }
}
