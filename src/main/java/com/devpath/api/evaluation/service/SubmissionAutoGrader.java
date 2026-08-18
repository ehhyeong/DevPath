package com.devpath.api.evaluation.service;

import com.devpath.api.evaluation.dto.response.SubmissionGradeResponse;
import com.devpath.common.provider.GeminiProvider;
import com.devpath.domain.learning.entity.Assignment;
import com.devpath.domain.learning.entity.Rubric;
import com.devpath.domain.learning.entity.Submission;
import com.devpath.domain.learning.entity.SubmissionFile;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
class SubmissionAutoGrader {

  private static final ObjectMapper MAPPER = new ObjectMapper();

  private final GeminiProvider geminiProvider;

  Result grade(Submission submission, List<Rubric> rubrics) {
    String raw = geminiProvider.generate(buildGradingPrompt(submission, rubrics));
    if (raw == null) {
      log.warn(
          "[SubmissionAutoGrader] Gemini API 응답 없음. Fallback 채점 실행. submissionId={}",
          submission.getId());
      return fallbackResult(rubrics, submission);
    }
    return parseResponse(raw, rubrics, submission);
  }

  private String buildSubmissionContent(Submission submission) {
    StringBuilder sb = new StringBuilder();
    if (submission.getSubmissionText() != null && !submission.getSubmissionText().isBlank()) {
      sb.append(submission.getSubmissionText());
    }
    if (submission.getSubmissionUrl() != null && !submission.getSubmissionUrl().isBlank()) {
      if (!sb.isEmpty()) {
        sb.append("\n");
      }
      sb.append("제출 URL: ").append(submission.getSubmissionUrl());
    }
    if (submission.getFiles() != null && !submission.getFiles().isEmpty()) {
      if (!sb.isEmpty()) {
        sb.append("\n");
      }
      sb.append("첨부 파일:\n");
      for (SubmissionFile file : submission.getFiles()) {
        if (Boolean.TRUE.equals(file.getIsDeleted())) {
          continue;
        }
        String fileType =
            file.getFileType() == null || file.getFileType().isBlank()
                ? "형식 미상"
                : file.getFileType();
        sb.append("- ")
            .append(file.getFileName())
            .append(" (")
            .append(fileType)
            .append(", ")
            .append(formatFileSize(file.getFileSize()));
        if (file.getFileUrl() != null
            && !file.getFileUrl().isBlank()
            && !file.getFileUrl().startsWith("local-upload://")) {
          sb.append(", url=").append(file.getFileUrl());
        }
        sb.append(")\n");
        if (file.getTextContent() != null && !file.getTextContent().isBlank()) {
          sb.append("[")
              .append(file.getFileName())
              .append(" content]\n```")
              .append(fileType)
              .append("\n")
              .append(truncateForPrompt(file.getTextContent(), 12000))
              .append("\n```\n");
        } else {
          sb.append("[").append(file.getFileName()).append(" content unavailable for review]\n");
        }
      }
    }
    return sb.isEmpty() ? "(제출 내용 없음)" : sb.toString();
  }

  private String buildGradingPrompt(Submission submission, List<Rubric> rubrics) {
    Assignment assignment = submission.getAssignment();
    StringBuilder rubricSection = new StringBuilder();
    for (Rubric rubric : rubrics) {
      rubricSection
          .append("- rubricId: ")
          .append(rubric.getId())
          .append(", 기준명: ")
          .append(rubric.getCriteriaName())
          .append(", 최대점수: ")
          .append(rubric.getMaxPoints());
      if (rubric.getCriteriaDescription() != null && !rubric.getCriteriaDescription().isBlank()) {
        rubricSection.append(", 평가키워드: ").append(rubric.getCriteriaDescription());
      }
      rubricSection.append("\n");
    }

    return "당신은 IT 교육 과제 채점 전문가입니다. 아래 제출물을 루브릭 기준에 따라 채점하세요.\n"
        + "반드시 점수와 함께 구체적인 한국어 코드 리뷰 코멘트를 작성하세요. "
        + "제출물이 print hello 수준이거나 과제와 무관하거나 파일 내용을 확인할 수 없으면 매우 낮은 점수 또는 0점을 주세요.\n\n"
        + "[과제 정보]\n"
        + "과제명: "
        + assignment.getTitle()
        + "\n과제 설명: "
        + assignment.getDescription()
        + "\n제출 규칙: "
        + (assignment.getSubmissionRuleDescription() == null
                || assignment.getSubmissionRuleDescription().isBlank()
            ? "(없음)"
            : assignment.getSubmissionRuleDescription())
        + "\n허용 형식: "
        + (assignment.getAllowedFileFormats() == null
                || assignment.getAllowedFileFormats().isBlank()
            ? "(제한 없음)"
            : assignment.getAllowedFileFormats())
        + "\n\n[제출물 내용]\n"
        + buildSubmissionContent(submission)
        + "\n\n[루브릭 목록]\n"
        + rubricSection
        + "\n[출력 형식]\n"
        + "아래 JSON 배열만 반환하세요. 설명, 코드블록(```), 기타 텍스트 없이 순수 JSON 배열만 출력하세요.\n\n"
        + "{ \"overallFeedback\": \"구체적인 한국어 총평\", \"rubricGrades\": [\n"
        + "  { \"rubricId\": 1, \"earnedPoints\": 8, \"reviewComment\": \"해당 루브릭에 대한 구체적인 한국어 코멘트\" }\n"
        + "] }\n\n[제약사항]\n"
        + "- earnedPoints는 0 이상 해당 루브릭의 최대점수 이하여야 합니다.\n"
        + "- 모든 루브릭에 대해 점수를 반드시 포함하세요.\n"
        + "- 평가키워드가 제출물에 포함되어 있으면 가산 요소로 반영하세요.\n"
        + "- 첨부 파일 메타데이터만 있고 구현 내용 확인이 불가능하면 루브릭별로 보수적으로 감점하세요.";
  }

  private String formatFileSize(Long fileSize) {
    if (fileSize == null || fileSize <= 0) {
      return "크기 미상";
    }
    if (fileSize < 1024) {
      return fileSize + "B";
    }
    long kilobytes = Math.max(1, (fileSize + 1023) / 1024);
    return kilobytes + "KB";
  }

  private String truncateForPrompt(String value, int maxLength) {
    if (value == null || value.length() <= maxLength) {
      return value;
    }
    return value.substring(0, maxLength) + "\n... truncated for review ...";
  }

  private Result parseResponse(String raw, List<Rubric> rubrics, Submission submission) {
    try {
      int objectStart = raw.indexOf('{');
      int arrayStart = raw.indexOf('[');
      int start =
          objectStart >= 0 && (arrayStart < 0 || objectStart < arrayStart)
              ? objectStart
              : arrayStart;
      int end = start == objectStart ? raw.lastIndexOf('}') : raw.lastIndexOf(']');
      if (start == -1 || end == -1 || start >= end) {
        log.warn("[SubmissionAutoGrader] Gemini 응답에서 JSON 추출 실패. Fallback 실행.");
        return fallbackResult(rubrics, submission);
      }

      JsonNode rootNode = MAPPER.readTree(raw.substring(start, end + 1));
      String overallFeedback = null;
      JsonNode gradesNode = rootNode;
      if (rootNode.isObject()) {
        overallFeedback = rootNode.path("overallFeedback").asText(null);
        gradesNode = rootNode.path("rubricGrades");
      }
      if (!gradesNode.isArray()) {
        return fallbackResult(rubrics, submission);
      }

      Map<Long, Rubric> rubricMap =
          rubrics.stream().collect(Collectors.toMap(Rubric::getId, Function.identity()));
      List<SubmissionGradeResponse.RubricGradeItem> items = new ArrayList<>();
      for (JsonNode node : gradesNode) {
        long rubricId = node.path("rubricId").asLong(-1);
        int earnedPoints = node.path("earnedPoints").asInt(0);
        Rubric rubric = rubricMap.get(rubricId);
        if (rubric == null) {
          continue;
        }
        items.add(
            SubmissionGradeResponse.RubricGradeItem.builder()
                .rubricId(rubric.getId())
                .criteriaName(rubric.getCriteriaName())
                .maxPoints(rubric.getMaxPoints())
                .earnedPoints(Math.max(0, Math.min(earnedPoints, rubric.getMaxPoints())))
                .reviewComment(node.path("reviewComment").asText(null))
                .build());
      }
      if (items.size() != rubrics.size()) {
        log.warn("[SubmissionAutoGrader] Gemini 응답 루브릭 수 불일치. Fallback 실행.");
        return fallbackResult(rubrics, submission);
      }
      return new Result(items, overallFeedback, false);
    } catch (Exception e) {
      log.warn("[SubmissionAutoGrader] Gemini 응답 파싱 실패. Fallback 실행.", e);
      return fallbackResult(rubrics, submission);
    }
  }

  private Result fallbackResult(List<Rubric> rubrics, Submission submission) {
    boolean weakSubmission = isWeakSubmission(submission);
    List<SubmissionGradeResponse.RubricGradeItem> items =
        rubrics.stream()
            .map(
                rubric ->
                    SubmissionGradeResponse.RubricGradeItem.builder()
                        .rubricId(rubric.getId())
                        .criteriaName(rubric.getCriteriaName())
                        .maxPoints(rubric.getMaxPoints())
                        .earnedPoints(rubric.getMaxPoints() / 2)
                        .reviewComment(
                            weakSubmission
                                ? "제출 내용이 너무 짧거나 실제 구현을 확인할 수 없어 기준을 충족하지 못했습니다."
                                : "AI 응답을 받지 못해 보수적인 기본 점수로 산정했습니다.")
                        .build())
            .toList();
    String feedback =
        weakSubmission
            ? "제출된 코드나 파일 내용만으로는 과제 요구사항을 충족했다고 보기 어렵습니다. 실제 구현, 예외 처리, 실행 결과, 설명을 포함해 다시 제출해야 합니다."
            : "AI 응답이 없어 자동 리뷰가 제한적으로 생성되었습니다. 루브릭별 기본 점수를 임시 산정했습니다.";
    return new Result(items, feedback, true);
  }

  private boolean isWeakSubmission(Submission submission) {
    String content = buildSubmissionContent(submission).replaceAll("\\s+", "");
    return content.length() < 80
        || content.contains("print(\"hello\")")
        || content.contains("print('hello')");
  }

  record Result(
      List<SubmissionGradeResponse.RubricGradeItem> rubricGradeItems,
      String overallFeedback,
      boolean fallbackUsed) {}
}
