package com.devpath.domain.qna.service;

import com.devpath.domain.qna.entity.Question;

public interface QnaAnswerEventPublisher {

  void answerCreated(Question question, Long answerId);

  void answerUpdated(Question question, Long answerId);

  void answerAdopted(Question question, Long answerId);
}
