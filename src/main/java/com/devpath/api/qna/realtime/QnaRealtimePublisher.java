package com.devpath.api.qna.realtime;

import com.devpath.domain.qna.entity.Question;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@RequiredArgsConstructor
public class QnaRealtimePublisher {

  public static final String TYPE_ANSWER_CREATED = "answer-created";
  public static final String TYPE_ANSWER_UPDATED = "answer-updated";
  public static final String TYPE_ANSWER_ADOPTED = "answer-adopted";

  private final QnaRealtimeWebSocketHandler webSocketHandler;

  public void answerCreated(Question question, Long answerId) {
    publishAfterCommit(question, answerId, TYPE_ANSWER_CREATED);
  }

  public void answerUpdated(Question question, Long answerId) {
    publishAfterCommit(question, answerId, TYPE_ANSWER_UPDATED);
  }

  public void answerAdopted(Question question, Long answerId) {
    publishAfterCommit(question, answerId, TYPE_ANSWER_ADOPTED);
  }

  private void publishAfterCommit(Question question, Long answerId, String type) {
    if (question == null || question.getUser() == null) {
      return;
    }

    Long userId = question.getUser().getId();
    Long courseId = question.getCourseId();
    Long questionId = question.getId();
    Runnable publish =
        () -> webSocketHandler.publishAnswerChanged(userId, courseId, questionId, answerId, type);

    if (TransactionSynchronizationManager.isActualTransactionActive()) {
      TransactionSynchronizationManager.registerSynchronization(
          new TransactionSynchronization() {
            @Override
            public void afterCommit() {
              publish.run();
            }
          });
      return;
    }

    publish.run();
  }
}
