package com.devpath.api.evaluation.service;

import com.devpath.domain.learning.entity.QuestionType;
import java.util.ArrayList;
import java.util.List;

class DraftQuestionState {
  Long draftQuestionId;
  QuestionType questionType;
  String questionText;
  String explanation;
  Integer points;
  Integer displayOrder;
  String sourceTimestamp;
  List<DraftOptionState> options = new ArrayList<>();
}

class DraftOptionState {
  Long draftOptionId;
  String optionText;
  Boolean correct;
  Integer displayOrder;
}
