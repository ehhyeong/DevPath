package com.devpath.api.instructor.service;

import com.devpath.api.evaluation.dto.request.CreateAiQuizDraftRequest;
import com.devpath.api.evaluation.dto.response.AiQuizDraftResponse;
import com.devpath.api.evaluation.service.AiQuizDraftService;
import com.devpath.api.instructor.dto.InstructorLessonEvaluationDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseNodeMapping;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.repository.CourseNodeMappingRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.learning.entity.Assignment;
import com.devpath.domain.learning.entity.AssignmentReferenceFile;
import com.devpath.domain.learning.entity.QuestionType;
import com.devpath.domain.learning.entity.Quiz;
import com.devpath.domain.learning.entity.QuizQuestion;
import com.devpath.domain.learning.entity.QuizQuestionOption;
import com.devpath.domain.learning.entity.QuizType;
import com.devpath.domain.learning.entity.Rubric;
import com.devpath.domain.learning.entity.SubmissionType;
import com.devpath.domain.learning.repository.AssignmentRepository;
import com.devpath.domain.learning.repository.QuizRepository;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InstructorLessonEvaluationService {

  private static final String DEFAULT_FILE_FORMATS = "pdf,zip,png,jpg,jpeg";

  private final UserRepository userRepository;
  private final LessonRepository lessonRepository;
  private final RoadmapRepository roadmapRepository;
  private final RoadmapNodeRepository roadmapNodeRepository;
  private final CourseNodeMappingRepository courseNodeMappingRepository;
  private final QuizRepository quizRepository;
  private final AssignmentRepository assignmentRepository;
  private final AiQuizDraftService aiQuizDraftService;

  public InstructorLessonEvaluationService(
      UserRepository userRepository,
      LessonRepository lessonRepository,
      RoadmapRepository roadmapRepository,
      RoadmapNodeRepository roadmapNodeRepository,
      CourseNodeMappingRepository courseNodeMappingRepository,
      QuizRepository quizRepository,
      AssignmentRepository assignmentRepository,
      AiQuizDraftService aiQuizDraftService) {
    this.userRepository = userRepository;
    this.lessonRepository = lessonRepository;
    this.roadmapRepository = roadmapRepository;
    this.roadmapNodeRepository = roadmapNodeRepository;
    this.courseNodeMappingRepository = courseNodeMappingRepository;
    this.quizRepository = quizRepository;
    this.assignmentRepository = assignmentRepository;
    this.aiQuizDraftService = aiQuizDraftService;
  }

  @Transactional(readOnly = true)
  public InstructorLessonEvaluationDto.QuizEditorResponse getQuizEditor(
      Long instructorId, Long lessonId) {
    validateAuthenticatedUser(instructorId);

    Lesson lesson = getOwnedLesson(instructorId, lessonId);
    RoadmapNode node = lesson.getQuizRoadmapNode();
    Quiz quiz =
        node == null
            ? null
            : quizRepository
                .findFirstByRoadmapNodeNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(node.getNodeId())
                .orElse(null);

    return mapQuizEditor(lesson, node, quiz);
  }

  @Transactional
  public InstructorLessonEvaluationDto.QuizEditorResponse saveQuizEditor(
      Long instructorId,
      Long lessonId,
      InstructorLessonEvaluationDto.SaveQuizEditorRequest request) {
    validateAuthenticatedUser(instructorId);

    Lesson lesson = getOwnedLesson(instructorId, lessonId);
    RoadmapNode node = ensureEvaluationNode(lesson, true);
    Quiz quiz =
        quizRepository
            .findFirstByRoadmapNodeNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(node.getNodeId())
            .orElse(null);

    if (quiz == null) {
      quiz =
          Quiz.builder()
              .roadmapNode(node)
              .title(defaultIfBlank(request.getTitle(), lesson.getTitle()))
              .description(normalizeText(request.getDescription()))
              .quizType(resolveQuizType(request.getQuizType(), QuizType.MANUAL))
              .totalScore(0)
              .passScore(request.getPassScore())
              .timeLimitMinutes(request.getTimeLimitMinutes())
              .isPublished(Boolean.TRUE.equals(request.getIsPublished()))
              .isActive(true)
              .exposeAnswer(Boolean.TRUE.equals(request.getExposeAnswer()))
              .exposeExplanation(Boolean.TRUE.equals(request.getExposeExplanation()))
              .build();
    }

    node.updateInfo(
        defaultIfBlank(request.getTitle(), lesson.getTitle()),
        normalizeText(request.getDescription()),
        "COURSE_QUIZ");

    quiz.updateInfo(
        defaultIfBlank(request.getTitle(), lesson.getTitle()),
        normalizeText(request.getDescription()),
        resolveQuizType(request.getQuizType(), quiz.getQuizType()),
        0,
        request.getPassScore(),
        request.getTimeLimitMinutes());
    quiz.updateExposePolicy(
        Boolean.TRUE.equals(request.getExposeAnswer()),
        Boolean.TRUE.equals(request.getExposeExplanation()));

    if (Boolean.TRUE.equals(request.getIsPublished())) {
      quiz.publish();
    } else {
      quiz.unpublish();
    }

    quiz.activate();
    quiz.getQuestions().clear();

    List<InstructorLessonEvaluationDto.QuizQuestionInput> questionInputs =
        request.getQuestions() == null
            ? List.of()
            : request.getQuestions().stream().filter(this::hasQuizQuestionContent).toList();

    int totalScore = 0;
    for (int questionIndex = 0; questionIndex < questionInputs.size(); questionIndex += 1) {
      InstructorLessonEvaluationDto.QuizQuestionInput questionInput =
          questionInputs.get(questionIndex);
      QuestionType questionType = resolveQuestionType(questionInput.getQuestionType());
      List<SanitizedQuizOption> options =
          sanitizeQuizOptions(questionType, questionInput.getOptions());

      QuizQuestion question =
          QuizQuestion.builder()
              .questionType(questionType)
              .questionText(defaultIfBlank(questionInput.getQuestionText(), "문항"))
              .explanation(normalizeText(questionInput.getExplanation()))
              .points(defaultNumber(questionInput.getPoints(), 5))
              .displayOrder(defaultNumber(questionInput.getDisplayOrder(), questionIndex + 1))
              .sourceTimestamp(normalizeText(questionInput.getSourceTimestamp()))
              .build();

      for (int optionIndex = 0; optionIndex < options.size(); optionIndex += 1) {
        SanitizedQuizOption option = options.get(optionIndex);
        question.addOption(
            QuizQuestionOption.builder()
                .optionText(option.optionText())
                .isCorrect(option.correct())
                .displayOrder(defaultNumber(option.displayOrder(), optionIndex + 1))
                .build());
      }

      totalScore += question.getPoints();
      quiz.addQuestion(question);
    }

    quiz.updateInfo(
        defaultIfBlank(request.getTitle(), lesson.getTitle()),
        normalizeText(request.getDescription()),
        resolveQuizType(request.getQuizType(), quiz.getQuizType()),
        totalScore,
        request.getPassScore(),
        request.getTimeLimitMinutes());

    Quiz savedQuiz = quizRepository.save(quiz);
    return mapQuizEditor(lesson, node, savedQuiz);
  }

  @Transactional
  public InstructorLessonEvaluationDto.QuizEditorResponse generateQuizDraft(
      Long instructorId, Long lessonId, InstructorLessonEvaluationDto.GenerateQuizRequest request) {
    validateAuthenticatedUser(instructorId);

    Lesson lesson = getOwnedLesson(instructorId, lessonId);
    RoadmapNode node = ensureEvaluationNode(lesson, true);
    Quiz existingQuiz =
        quizRepository
            .findFirstByRoadmapNodeNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(node.getNodeId())
            .orElse(null);

    AiQuizDraftResponse draft =
        aiQuizDraftService.createDraft(
            instructorId,
            CreateAiQuizDraftRequest.builder()
                .nodeId(node.getNodeId())
                .title(
                    existingQuiz == null
                        ? defaultIfBlank(lesson.getTitle(), "새 퀴즈")
                        : existingQuiz.getTitle())
                .description(
                    existingQuiz == null
                        ? normalizeText(lesson.getDescription())
                        : existingQuiz.getDescription())
                .quizType(resolveGeneratedQuizType(request.getMode()))
                .sourceText(buildQuizSourceText(lesson, request))
                .sourceTimestamp(normalizeText(request.getVideoFileName()))
                .sourceMimeType(normalizeText(request.getVideoMimeType()))
                .sourceBase64Content(normalizeText(request.getVideoBase64Content()))
                .fallbackOnly(!hasGenerationInput(request))
                .questionCount(clampQuestionCount(request.getQuestionCount()))
                .difficultyLevel(clampDifficultyLevel(request.getDifficultyLevel()))
                .build());

    return buildQuizDraftResponse(lesson, node, existingQuiz, draft);
  }

  @Transactional(readOnly = true)
  public InstructorLessonEvaluationDto.AssignmentEditorResponse getAssignmentEditor(
      Long instructorId, Long lessonId) {
    validateAuthenticatedUser(instructorId);

    Lesson lesson = getOwnedLesson(instructorId, lessonId);
    RoadmapNode node = lesson.getAssignmentRoadmapNode();
    Assignment assignment =
        node == null
            ? null
            : assignmentRepository
                .findFirstByRoadmapNodeNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(node.getNodeId())
                .orElse(null);

    return mapAssignmentEditor(lesson, node, assignment);
  }

  @Transactional
  public InstructorLessonEvaluationDto.AssignmentEditorResponse saveAssignmentEditor(
      Long instructorId,
      Long lessonId,
      InstructorLessonEvaluationDto.SaveAssignmentEditorRequest request) {
    validateAuthenticatedUser(instructorId);

    Lesson lesson = getOwnedLesson(instructorId, lessonId);
    RoadmapNode node = ensureEvaluationNode(lesson, false);
    Assignment assignment =
        assignmentRepository
            .findFirstByRoadmapNodeNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(node.getNodeId())
            .orElse(null);

    boolean allowTextSubmission = resolveFlag(request.getAllowTextSubmission(), true);
    boolean allowFileSubmission = resolveFlag(request.getAllowFileSubmission(), true);
    boolean allowUrlSubmission = resolveFlag(request.getAllowUrlSubmission(), false);
    boolean aiReviewEnabled = resolveFlag(request.getAiReviewEnabled(), true);

    List<InstructorLessonEvaluationDto.AssignmentRubricInput> rubricInputs =
        request.getRubrics() == null
            ? List.of()
            : request.getRubrics().stream().filter(this::hasRubricContent).toList();

    int totalScore =
        rubricInputs.stream().mapToInt(item -> defaultNumber(item.getMaxPoints(), 0)).sum();
    int passScore =
        Math.min(defaultNumber(request.getPassScore(), Math.min(totalScore, 80)), totalScore);

    if (assignment == null) {
      assignment =
          Assignment.builder()
              .roadmapNode(node)
              .title(defaultIfBlank(request.getTitle(), lesson.getTitle()))
              .description(defaultIfBlank(request.getDescription(), ""))
              .submissionType(
                  resolveSubmissionType(
                      allowTextSubmission, allowFileSubmission, allowUrlSubmission))
              .dueAt(null)
              .allowedFileFormats(allowFileSubmission ? DEFAULT_FILE_FORMATS : null)
              .readmeRequired(false)
              .testRequired(false)
              .lintRequired(false)
              .submissionRuleDescription(null)
              .totalScore(totalScore)
              .passScore(passScore)
              .isPublished(true)
              .isActive(true)
              .allowLateSubmission(false)
              .aiReviewEnabled(aiReviewEnabled)
              .allowTextSubmission(allowTextSubmission)
              .allowFileSubmission(allowFileSubmission)
              .allowUrlSubmission(allowUrlSubmission)
              .build();
    }

    node.updateInfo(
        defaultIfBlank(request.getTitle(), lesson.getTitle()),
        normalizeText(request.getDescription()),
        "COURSE_ASSIGNMENT");

    assignment.updateInfo(
        defaultIfBlank(request.getTitle(), lesson.getTitle()),
        defaultIfBlank(request.getDescription(), ""),
        resolveSubmissionType(allowTextSubmission, allowFileSubmission, allowUrlSubmission),
        assignment.getDueAt(),
        totalScore);
    assignment.updateSubmissionRule(
        allowFileSubmission ? DEFAULT_FILE_FORMATS : null,
        false,
        false,
        false,
        assignment.getSubmissionRuleDescription(),
        false);
    assignment.updateEditorSettings(
        passScore, aiReviewEnabled, allowTextSubmission, allowFileSubmission, allowUrlSubmission);

    Map<Long, AssignmentReferenceFile> existingFiles =
        assignment.getReferenceFiles().stream()
            .filter(file -> file.getId() != null)
            .collect(
                Collectors.toMap(
                    AssignmentReferenceFile::getId,
                    file -> file,
                    (left, right) -> left,
                    LinkedHashMap::new));

    assignment.getRubrics().clear();
    for (int rubricIndex = 0; rubricIndex < rubricInputs.size(); rubricIndex += 1) {
      InstructorLessonEvaluationDto.AssignmentRubricInput rubricInput =
          rubricInputs.get(rubricIndex);
      assignment.addRubric(
          Rubric.builder()
              .criteriaName(defaultIfBlank(rubricInput.getCriteriaName(), "평가 항목"))
              .criteriaDescription(normalizeText(rubricInput.getCriteriaKeywords()))
              .maxPoints(defaultNumber(rubricInput.getMaxPoints(), 0))
              .displayOrder(defaultNumber(rubricInput.getDisplayOrder(), rubricIndex + 1))
              .build());
    }

    assignment.getReferenceFiles().clear();
    List<InstructorLessonEvaluationDto.AssignmentReferenceFileInput> fileInputs =
        request.getReferenceFiles() == null ? List.of() : request.getReferenceFiles();

    for (int fileIndex = 0; fileIndex < fileInputs.size(); fileIndex += 1) {
      InstructorLessonEvaluationDto.AssignmentReferenceFileInput fileInput =
          fileInputs.get(fileIndex);
      if (!hasReferenceFileContent(fileInput)) {
        continue;
      }

      assignment.addReferenceFile(
          AssignmentReferenceFile.builder()
              .fileName(defaultIfBlank(fileInput.getFileName(), "reference-file"))
              .contentType(normalizeText(fileInput.getContentType()))
              .fileSize(fileInput.getFileSize() == null ? 0L : fileInput.getFileSize())
              .displayOrder(defaultNumber(fileInput.getDisplayOrder(), fileIndex + 1))
              .fileData(resolveReferenceFileBytes(fileInput, existingFiles))
              .build());
    }

    Assignment savedAssignment = assignmentRepository.save(assignment);
    return mapAssignmentEditor(lesson, node, savedAssignment);
  }

  private void validateAuthenticatedUser(Long instructorId) {
    if (instructorId == null) {
      throw new CustomException(ErrorCode.UNAUTHORIZED);
    }

    if (!userRepository.existsById(instructorId)) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
  }

  private Lesson getOwnedLesson(Long instructorId, Long lessonId) {
    return lessonRepository
        .findByLessonIdAndSectionCourseInstructorId(lessonId, instructorId)
        .orElseGet(
            () -> {
              if (lessonRepository.existsById(lessonId)) {
                throw new CustomException(ErrorCode.FORBIDDEN);
              }
              throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND);
            });
  }

  private RoadmapNode ensureEvaluationNode(Lesson lesson, boolean quizNode) {
    RoadmapNode currentNode =
        quizNode ? lesson.getQuizRoadmapNode() : lesson.getAssignmentRoadmapNode();
    if (currentNode != null) {
      return currentNode;
    }

    Course course = lesson.getSection().getCourse();
    String scopeLabel = quizNode ? "퀴즈" : "과제";

    Roadmap roadmap =
        roadmapRepository.save(
            Roadmap.builder()
                .title(course.getTitle() + " " + scopeLabel + " 워크스페이스")
                .description(course.getTitle() + "의 " + scopeLabel + " 편집용 비공개 로드맵")
                .creator(course.getInstructor())
                .isOfficial(false)
                .isPublic(false)
                .build());

    RoadmapNode node =
        roadmapNodeRepository.save(
            RoadmapNode.builder()
                .roadmap(roadmap)
                .title(defaultIfBlank(lesson.getTitle(), scopeLabel))
                .content(normalizeText(lesson.getDescription()))
                .nodeType(quizNode ? "COURSE_QUIZ" : "COURSE_ASSIGNMENT")
                .sortOrder(0)
                .subTopics(null)
                .branchGroup(null)
                .build());

    courseNodeMappingRepository.save(CourseNodeMapping.builder().course(course).node(node).build());

    if (quizNode) {
      lesson.linkQuizRoadmapNode(node);
    } else {
      lesson.linkAssignmentRoadmapNode(node);
    }

    return node;
  }

  private InstructorLessonEvaluationDto.QuizEditorResponse buildQuizDraftResponse(
      Lesson lesson, RoadmapNode node, Quiz existingQuiz, AiQuizDraftResponse draft) {
    return InstructorLessonEvaluationDto.QuizEditorResponse.builder()
        .lessonId(lesson.getLessonId())
        .nodeId(node.getNodeId())
        .quizId(existingQuiz == null ? null : existingQuiz.getId())
        .title(draft.getTitle())
        .description(draft.getDescription())
        .quizType(draft.getQuizType() == null ? QuizType.MANUAL.name() : draft.getQuizType().name())
        .totalScore(
            draft.getQuestions().stream()
                .mapToInt(question -> question.getPoints() == null ? 0 : question.getPoints())
                .sum())
        .passScore(existingQuiz == null ? 60 : defaultNumber(existingQuiz.getPassScore(), 60))
        .timeLimitMinutes(
            existingQuiz == null ? 10 : defaultNumber(existingQuiz.getTimeLimitMinutes(), 10))
        .exposeAnswer(existingQuiz != null && Boolean.TRUE.equals(existingQuiz.getExposeAnswer()))
        .exposeExplanation(
            existingQuiz != null && Boolean.TRUE.equals(existingQuiz.getExposeExplanation()))
        .isPublished(existingQuiz != null && Boolean.TRUE.equals(existingQuiz.getIsPublished()))
        .questions(
            draft.getQuestions().stream()
                .map(
                    question ->
                        InstructorLessonEvaluationDto.QuizQuestionItem.builder()
                            .questionId(null)
                            .questionType(question.getQuestionType().name())
                            .questionText(question.getQuestionText())
                            .explanation(question.getExplanation())
                            .points(question.getPoints())
                            .displayOrder(question.getDisplayOrder())
                            .sourceTimestamp(question.getSourceTimestamp())
                            .options(
                                question.getOptions().stream()
                                    .map(
                                        option ->
                                            InstructorLessonEvaluationDto.QuizOptionItem.builder()
                                                .optionId(null)
                                                .optionText(option.getOptionText())
                                                .isCorrect(option.getCorrect())
                                                .displayOrder(option.getDisplayOrder())
                                                .build())
                                    .toList())
                            .build())
                .toList())
        .build();
  }

  private InstructorLessonEvaluationDto.QuizEditorResponse mapQuizEditor(
      Lesson lesson, RoadmapNode node, Quiz quiz) {
    if (quiz == null) {
      return InstructorLessonEvaluationDto.QuizEditorResponse.builder()
          .lessonId(lesson.getLessonId())
          .nodeId(node == null ? null : node.getNodeId())
          .quizId(null)
          .title(defaultIfBlank(lesson.getTitle(), "새 퀴즈"))
          .description(normalizeText(lesson.getDescription()))
          .quizType(QuizType.MANUAL.name())
          .totalScore(0)
          .passScore(60)
          .timeLimitMinutes(10)
          .exposeAnswer(false)
          .exposeExplanation(false)
          .isPublished(false)
          .questions(List.of())
          .build();
    }

    return InstructorLessonEvaluationDto.QuizEditorResponse.builder()
        .lessonId(lesson.getLessonId())
        .nodeId(quiz.getRoadmapNode().getNodeId())
        .quizId(quiz.getId())
        .title(quiz.getTitle())
        .description(quiz.getDescription())
        .quizType(quiz.getQuizType() == null ? QuizType.MANUAL.name() : quiz.getQuizType().name())
        .totalScore(defaultNumber(quiz.getTotalScore(), 0))
        .passScore(defaultNumber(quiz.getPassScore(), 60))
        .timeLimitMinutes(defaultNumber(quiz.getTimeLimitMinutes(), 10))
        .exposeAnswer(Boolean.TRUE.equals(quiz.getExposeAnswer()))
        .exposeExplanation(Boolean.TRUE.equals(quiz.getExposeExplanation()))
        .isPublished(Boolean.TRUE.equals(quiz.getIsPublished()))
        .questions(
            quiz.getQuestions().stream()
                .filter(question -> !Boolean.TRUE.equals(question.getIsDeleted()))
                .sorted(Comparator.comparing(QuizQuestion::getDisplayOrder))
                .map(
                    question ->
                        InstructorLessonEvaluationDto.QuizQuestionItem.builder()
                            .questionId(question.getId())
                            .questionType(question.getQuestionType().name())
                            .questionText(question.getQuestionText())
                            .explanation(question.getExplanation())
                            .points(question.getPoints())
                            .displayOrder(question.getDisplayOrder())
                            .sourceTimestamp(question.getSourceTimestamp())
                            .options(
                                question.getOptions().stream()
                                    .filter(option -> !Boolean.TRUE.equals(option.getIsDeleted()))
                                    .sorted(
                                        Comparator.comparing(QuizQuestionOption::getDisplayOrder))
                                    .map(
                                        option ->
                                            InstructorLessonEvaluationDto.QuizOptionItem.builder()
                                                .optionId(option.getId())
                                                .optionText(option.getOptionText())
                                                .isCorrect(option.getIsCorrect())
                                                .displayOrder(option.getDisplayOrder())
                                                .build())
                                    .toList())
                            .build())
                .toList())
        .build();
  }

  private InstructorLessonEvaluationDto.AssignmentEditorResponse mapAssignmentEditor(
      Lesson lesson, RoadmapNode node, Assignment assignment) {
    if (assignment == null) {
      return InstructorLessonEvaluationDto.AssignmentEditorResponse.builder()
          .lessonId(lesson.getLessonId())
          .nodeId(node == null ? null : node.getNodeId())
          .assignmentId(null)
          .title(defaultIfBlank(lesson.getTitle(), "새 과제"))
          .description(defaultIfBlank(lesson.getDescription(), ""))
          .totalScore(100)
          .passScore(80)
          .aiReviewEnabled(true)
          .allowTextSubmission(true)
          .allowFileSubmission(true)
          .allowUrlSubmission(false)
          .rubrics(List.of())
          .referenceFiles(List.of())
          .build();
    }

    SubmissionFlags submissionFlags = resolveSubmissionFlags(assignment);
    List<Rubric> activeRubrics =
        assignment.getRubrics().stream()
            .filter(rubric -> !Boolean.TRUE.equals(rubric.getIsDeleted()))
            .sorted(Comparator.comparing(Rubric::getDisplayOrder))
            .toList();

    return InstructorLessonEvaluationDto.AssignmentEditorResponse.builder()
        .lessonId(lesson.getLessonId())
        .nodeId(assignment.getRoadmapNode().getNodeId())
        .assignmentId(assignment.getId())
        .title(assignment.getTitle())
        .description(assignment.getDescription())
        .totalScore(defaultNumber(assignment.getTotalScore(), 100))
        .passScore(
            assignment.getPassScore() == null
                ? Math.min(defaultNumber(assignment.getTotalScore(), 100), 80)
                : assignment.getPassScore())
        .aiReviewEnabled(assignment.getAiReviewEnabled() == null || Boolean.TRUE.equals(assignment.getAiReviewEnabled()))
        .allowTextSubmission(submissionFlags.allowTextSubmission())
        .allowFileSubmission(submissionFlags.allowFileSubmission())
        .allowUrlSubmission(submissionFlags.allowUrlSubmission())
        .rubrics(
            activeRubrics.stream()
                .map(
                    rubric ->
                        InstructorLessonEvaluationDto.AssignmentRubricItem.builder()
                            .rubricId(rubric.getId())
                            .criteriaName(rubric.getCriteriaName())
                            .criteriaKeywords(rubric.getCriteriaDescription())
                            .maxPoints(rubric.getMaxPoints())
                            .displayOrder(rubric.getDisplayOrder())
                            .build())
                .toList())
        .referenceFiles(
            assignment.getReferenceFiles().stream()
                .sorted(Comparator.comparing(AssignmentReferenceFile::getDisplayOrder))
                .map(
                    file ->
                        InstructorLessonEvaluationDto.AssignmentReferenceFileItem.builder()
                            .fileId(file.getId())
                            .fileName(file.getFileName())
                            .contentType(file.getContentType())
                            .fileSize(file.getFileSize())
                            .displayOrder(file.getDisplayOrder())
                            .createdAt(null)
                            .build())
                .toList())
        .build();
  }

  private boolean hasQuizQuestionContent(InstructorLessonEvaluationDto.QuizQuestionInput input) {
    if (input == null) {
      return false;
    }

    if (!isBlank(input.getQuestionText())) {
      return true;
    }

    return input.getOptions() != null
        && input.getOptions().stream()
            .anyMatch(option -> option != null && !isBlank(option.getOptionText()));
  }

  private List<SanitizedQuizOption> sanitizeQuizOptions(
      QuestionType questionType, List<InstructorLessonEvaluationDto.QuizOptionInput> inputs) {
    List<SanitizedQuizOption> options =
        inputs == null
            ? new ArrayList<>()
            : inputs.stream()
                .filter(
                    input ->
                        input != null
                            && (!isBlank(input.getOptionText())
                                || questionType == QuestionType.TRUE_FALSE))
                .map(
                    input ->
                        new SanitizedQuizOption(
                            defaultIfBlank(input.getOptionText(), ""),
                            Boolean.TRUE.equals(input.getIsCorrect()),
                            input.getDisplayOrder()))
                .collect(Collectors.toCollection(ArrayList::new));

    if (questionType == QuestionType.TRUE_FALSE) {
      if (options.size() != 2
          || options.stream().filter(SanitizedQuizOption::correct).count() != 1) {
        return List.of(
            new SanitizedQuizOption("O", true, 1), new SanitizedQuizOption("X", false, 2));
      }
      return options;
    }

    if (questionType == QuestionType.SHORT_ANSWER) {
      if (options.isEmpty()) {
        return List.of(new SanitizedQuizOption("", true, 1));
      }
      SanitizedQuizOption first = options.get(0);
      return List.of(new SanitizedQuizOption(first.optionText(), true, 1));
    }

    if (options.size() < 2) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "객관식 문항은 보기 2개 이상이 필요합니다.");
    }

    if (options.stream().noneMatch(SanitizedQuizOption::correct)) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "객관식 문항은 정답 보기가 필요합니다.");
    }

    return options;
  }

  private QuestionType resolveQuestionType(String rawValue) {
    if (isBlank(rawValue)) {
      return QuestionType.MULTIPLE_CHOICE;
    }

    try {
      return QuestionType.valueOf(rawValue.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "지원하지 않는 문항 유형입니다.");
    }
  }

  private QuizType resolveQuizType(String rawValue, QuizType fallback) {
    if (isBlank(rawValue)) {
      return fallback == null ? QuizType.MANUAL : fallback;
    }

    try {
      return QuizType.valueOf(rawValue.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      return fallback == null ? QuizType.MANUAL : fallback;
    }
  }

  private QuizType resolveGeneratedQuizType(String mode) {
    return "video".equalsIgnoreCase(mode) ? QuizType.AI_VIDEO : QuizType.AI_TOPIC;
  }

  private String buildQuizSourceText(
      Lesson lesson, InstructorLessonEvaluationDto.GenerateQuizRequest request) {
    List<String> parts = new ArrayList<>();

    if (request.getKeywords() != null && !request.getKeywords().isEmpty()) {
      String keywordText =
          request.getKeywords().stream()
              .filter(value -> !isBlank(value))
              .collect(Collectors.joining(", "));
      if (!isBlank(keywordText)) {
        parts.add("키워드: " + keywordText);
      }
    }

    if (!isBlank(request.getScriptText())) {
      parts.add(request.getScriptText().trim());
    }

    if (!isBlank(request.getVideoFileName())) {
      parts.add("비디오 파일: " + request.getVideoFileName().trim());
    }

    if (!isBlank(lesson.getTitle())) {
      parts.add("레슨 제목: " + lesson.getTitle().trim());
    }

    if (!isBlank(lesson.getDescription())) {
      parts.add("레슨 설명: " + lesson.getDescription().trim());
    }

    return parts.isEmpty() ? "기본 학습 내용을 바탕으로 퀴즈를 생성합니다." : String.join("\n", parts);
  }

  private boolean hasGenerationInput(InstructorLessonEvaluationDto.GenerateQuizRequest request) {
    if ("video".equalsIgnoreCase(request.getMode())) {
      return !isBlank(request.getVideoBase64Content()) || !isBlank(request.getVideoFileName());
    }

    boolean hasKeyword =
        request.getKeywords() != null
            && request.getKeywords().stream().anyMatch(value -> !isBlank(value));
    return hasKeyword || !isBlank(request.getScriptText());
  }

  private int clampQuestionCount(Integer questionCount) {
    if (questionCount == null) {
      return 3;
    }
    return Math.max(1, Math.min(questionCount, 10));
  }

  private int clampDifficultyLevel(Integer difficultyLevel) {
    if (difficultyLevel == null) {
      return 2;
    }
    return Math.max(1, Math.min(difficultyLevel, 3));
  }

  private boolean hasRubricContent(InstructorLessonEvaluationDto.AssignmentRubricInput input) {
    if (input == null) {
      return false;
    }

    return !isBlank(input.getCriteriaName())
        || !isBlank(input.getCriteriaKeywords())
        || defaultNumber(input.getMaxPoints(), 0) > 0;
  }

  private boolean hasReferenceFileContent(
      InstructorLessonEvaluationDto.AssignmentReferenceFileInput input) {
    if (input == null) {
      return false;
    }

    return input.getFileId() != null
        || !isBlank(input.getFileName())
        || !isBlank(input.getBase64Content());
  }

  private byte[] resolveReferenceFileBytes(
      InstructorLessonEvaluationDto.AssignmentReferenceFileInput input,
      Map<Long, AssignmentReferenceFile> existingFiles) {
    if (!isBlank(input.getBase64Content())) {
      return Base64.getDecoder().decode(input.getBase64Content());
    }

    if (input.getFileId() != null) {
      AssignmentReferenceFile existing = existingFiles.get(input.getFileId());
      if (existing != null) {
        return existing.getFileData();
      }
    }

    return new byte[0];
  }

  private SubmissionType resolveSubmissionType(
      boolean allowTextSubmission, boolean allowFileSubmission, boolean allowUrlSubmission) {
    int enabledCount = 0;
    enabledCount += allowTextSubmission ? 1 : 0;
    enabledCount += allowFileSubmission ? 1 : 0;
    enabledCount += allowUrlSubmission ? 1 : 0;

    if (enabledCount > 1) {
      return SubmissionType.MULTIPLE;
    }
    if (allowFileSubmission) {
      return SubmissionType.FILE;
    }
    if (allowUrlSubmission) {
      return SubmissionType.URL;
    }
    return SubmissionType.TEXT;
  }

  private SubmissionFlags resolveSubmissionFlags(Assignment assignment) {
    if (assignment.getAllowTextSubmission() != null
        || assignment.getAllowFileSubmission() != null
        || assignment.getAllowUrlSubmission() != null) {
      return new SubmissionFlags(
          Boolean.TRUE.equals(assignment.getAllowTextSubmission()),
          Boolean.TRUE.equals(assignment.getAllowFileSubmission()),
          Boolean.TRUE.equals(assignment.getAllowUrlSubmission()));
    }

    SubmissionType submissionType = assignment.getSubmissionType();
    if (submissionType == null) {
      return new SubmissionFlags(true, true, false);
    }

    return switch (submissionType) {
      case FILE -> new SubmissionFlags(false, true, false);
      case URL -> new SubmissionFlags(false, false, true);
      case TEXT -> new SubmissionFlags(true, false, false);
      case MULTIPLE -> new SubmissionFlags(true, true, true);
    };
  }

  private boolean resolveFlag(Boolean value, boolean fallback) {
    return value == null ? fallback : value;
  }

  private String defaultIfBlank(String value, String fallback) {
    return isBlank(value) ? fallback : value.trim();
  }

  private String normalizeText(String value) {
    return isBlank(value) ? null : value.trim();
  }

  private Integer defaultNumber(Integer value, int fallback) {
    return value == null ? fallback : Math.max(value, 0);
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private record SubmissionFlags(
      boolean allowTextSubmission, boolean allowFileSubmission, boolean allowUrlSubmission) {}

  private record SanitizedQuizOption(String optionText, boolean correct, Integer displayOrder) {}
}
