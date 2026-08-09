package com.devpath.api.analytics.service;

import com.devpath.domain.learning.entity.QuizAttempt;
import com.devpath.domain.learning.entity.Submission;
import java.util.Collection;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class InstructorAnalyticsMetrics {

  public double quizScoreRate(QuizAttempt attempt, int decimalPlaces) {
    int maxScore = safeInt(attempt.getMaxScore());
    if (maxScore <= 0) {
      return 0.0;
    }
    return round((safeInt(attempt.getScore()) * 100.0) / maxScore, decimalPlaces);
  }

  public double assignmentScoreRate(Submission submission, int decimalPlaces) {
    int maxScore = safeInt(submission.getAssignment().getTotalScore());
    if (maxScore <= 0 || submission.getTotalScore() == null) {
      return 0.0;
    }
    return round((submission.getTotalScore() * 100.0) / maxScore, decimalPlaces);
  }

  public double percent(long numerator, long denominator, int decimalPlaces) {
    if (denominator <= 0) {
      return 0.0;
    }
    return round((numerator * 100.0) / denominator, decimalPlaces);
  }

  public double averageIntegers(Collection<Integer> values, int decimalPlaces) {
    List<Integer> filtered = values.stream().filter(value -> value != null).toList();
    if (filtered.isEmpty()) {
      return 0.0;
    }
    return round(
        filtered.stream().mapToInt(Integer::intValue).average().orElse(0.0), decimalPlaces);
  }

  public double averageDoubles(Collection<Double> values, int decimalPlaces) {
    List<Double> filtered = values.stream().filter(value -> value != null).toList();
    if (filtered.isEmpty()) {
      return 0.0;
    }
    return round(
        filtered.stream().mapToDouble(Double::doubleValue).average().orElse(0.0), decimalPlaces);
  }

  public double round(double value, int decimalPlaces) {
    double factor = Math.pow(10.0, decimalPlaces);
    return Math.round(value * factor) / factor;
  }

  public int safeInt(Integer value) {
    return value == null ? 0 : value;
  }
}
