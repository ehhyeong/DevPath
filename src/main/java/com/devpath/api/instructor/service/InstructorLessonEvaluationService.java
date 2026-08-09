package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.InstructorLessonEvaluationDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseNodeMapping;
import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.course.repository.CourseNodeMappingRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class InstructorLessonEvaluationService {

  private final UserRepository userRepository;
  private final LessonRepository lessonRepository;
  private final RoadmapRepository roadmapRepository;
  private final RoadmapNodeRepository roadmapNodeRepository;
  private final CourseNodeMappingRepository courseNodeMappingRepository;
  private final InstructorQuizEditor quizEditor;
  private final InstructorAssignmentEditor assignmentEditor;

  @Transactional(readOnly = true)
  public InstructorLessonEvaluationDto.QuizEditorResponse getQuizEditor(
      Long instructorId, Long lessonId) {
    validateAuthenticatedUser(instructorId);
    Lesson lesson = getOwnedLesson(instructorId, lessonId);
    return quizEditor.get(lesson, lesson.getQuizRoadmapNode());
  }

  @Transactional
  public InstructorLessonEvaluationDto.QuizEditorResponse saveQuizEditor(
      Long instructorId,
      Long lessonId,
      InstructorLessonEvaluationDto.SaveQuizEditorRequest request) {
    validateAuthenticatedUser(instructorId);
    Lesson lesson = getOwnedLesson(instructorId, lessonId);
    return quizEditor.save(lesson, ensureEvaluationNode(lesson, true), request);
  }

  @Transactional
  public InstructorLessonEvaluationDto.QuizEditorResponse generateQuizDraft(
      Long instructorId, Long lessonId, InstructorLessonEvaluationDto.GenerateQuizRequest request) {
    validateAuthenticatedUser(instructorId);
    Lesson lesson = getOwnedLesson(instructorId, lessonId);
    return quizEditor.generate(instructorId, lesson, ensureEvaluationNode(lesson, true), request);
  }

  @Transactional(readOnly = true)
  public InstructorLessonEvaluationDto.AssignmentEditorResponse getAssignmentEditor(
      Long instructorId, Long lessonId) {
    validateAuthenticatedUser(instructorId);
    Lesson lesson = getOwnedLesson(instructorId, lessonId);
    return assignmentEditor.get(lesson, lesson.getAssignmentRoadmapNode());
  }

  @Transactional
  public InstructorLessonEvaluationDto.AssignmentEditorResponse saveAssignmentEditor(
      Long instructorId,
      Long lessonId,
      InstructorLessonEvaluationDto.SaveAssignmentEditorRequest request) {
    validateAuthenticatedUser(instructorId);
    Lesson lesson = getOwnedLesson(instructorId, lessonId);
    return assignmentEditor.save(lesson, ensureEvaluationNode(lesson, false), request);
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

  private String defaultIfBlank(String value, String fallback) {
    return isBlank(value) ? fallback : value.trim();
  }

  private String normalizeText(String value) {
    return isBlank(value) ? null : value.trim();
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}
