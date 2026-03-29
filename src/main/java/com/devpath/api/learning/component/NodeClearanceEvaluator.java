package com.devpath.api.learning.component;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.repository.CourseNodeMappingRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.learning.entity.Assignment;
import com.devpath.domain.learning.entity.Quiz;
import com.devpath.domain.learning.entity.Submission;
import com.devpath.domain.learning.entity.SubmissionStatus;
import com.devpath.domain.learning.entity.clearance.ClearanceReasonType;
import com.devpath.domain.learning.entity.clearance.ClearanceStatus;
import com.devpath.domain.learning.repository.AssignmentRepository;
import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.learning.repository.QuizAttemptRepository;
import com.devpath.domain.learning.repository.QuizRepository;
import com.devpath.domain.learning.repository.SubmissionRepository;
import com.devpath.domain.roadmap.entity.NodeCompletionRule;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.NodeCompletionRuleRepository;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

// 노드 클리어 판정 조건을 계산한다.
@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NodeClearanceEvaluator {

    // 로드맵 노드 저장소다.
    private final RoadmapNodeRepository roadmapNodeRepository;

    // 강의-노드 매핑 저장소다.
    private final CourseNodeMappingRepository courseNodeMappingRepository;

    // 레슨 저장소다.
    private final LessonRepository lessonRepository;

    // 레슨 진도 저장소다.
    private final LessonProgressRepository lessonProgressRepository;

    // 노드 필수 태그 저장소다.
    private final NodeRequiredTagRepository nodeRequiredTagRepository;

    // 유저 기술 스택 저장소다.
    private final UserTechStackRepository userTechStackRepository;

    // 과제 저장소다.
    private final AssignmentRepository assignmentRepository;

    // 과제 제출 저장소다.
    private final SubmissionRepository submissionRepository;

    private final QuizRepository quizRepository;

    private final QuizAttemptRepository quizAttemptRepository;

    // 노드 완료 규칙 저장소다.
    private final NodeCompletionRuleRepository nodeCompletionRuleRepository;

    // 특정 학습자의 특정 노드 클리어 상태를 평가한다.
    public EvaluationResult evaluate(Long userId, Long nodeId) {
        RoadmapNode node = roadmapNodeRepository.findById(nodeId)
            .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NODE_NOT_FOUND));

        List<String> requiredTags = nodeRequiredTagRepository.findTagNamesByNodeId(nodeId);
        List<String> userTags = userTechStackRepository.findTagNamesByUserId(userId);
        List<String> missingTags = extractMissingTags(requiredTags, userTags);

        boolean requiredTagsSatisfied = missingTags.isEmpty();

        List<Long> courseIds = courseNodeMappingRepository.findCourseIdsByNodeId(node.getNodeId());
        long totalLessonCount = courseIds.isEmpty()
            ? 0L
            : lessonRepository.countPublishedLessonsByCourseIds(courseIds);

        long completedLessonCount = courseIds.isEmpty()
            ? 0L
            : lessonProgressRepository.countCompletedLessonsByUserIdAndCourseIds(userId, courseIds);

        BigDecimal lessonCompletionRate = calculateLessonCompletionRate(totalLessonCount, completedLessonCount);
        boolean lessonCompleted = totalLessonCount == 0L || completedLessonCount >= totalLessonCount;
        boolean quizPassed = hasQuizPassed(nodeId, userId);
        boolean assignmentPassed = hasAssignmentPassed(nodeId, userId);
        boolean proofEligible = lessonCompleted && requiredTagsSatisfied && quizPassed && assignmentPassed;
        ClearanceStatus clearanceStatus = proofEligible ? ClearanceStatus.CLEARED : ClearanceStatus.NOT_CLEARED;

        return EvaluationResult.builder()
            .nodeId(node.getNodeId())
            .nodeTitle(node.getTitle())
            .clearanceStatus(clearanceStatus)
            .lessonCompletionRate(lessonCompletionRate)
            .requiredTagsSatisfied(requiredTagsSatisfied)
            .missingTags(missingTags)
            .lessonCompleted(lessonCompleted)
            .quizPassed(quizPassed)
            .assignmentPassed(assignmentPassed)
            .proofEligible(proofEligible)
            .reasons(buildReasons(
                lessonCompletionRate,
                requiredTagsSatisfied,
                missingTags,
                quizPassed,
                assignmentPassed,
                proofEligible
            ))
            .build();
    }

    // 부족한 태그 목록을 계산한다.
    private List<String> extractMissingTags(List<String> requiredTags, List<String> userTags) {
        Set<String> normalizedUserTags = new LinkedHashSet<>();

        for (String userTag : userTags) {
            normalizedUserTags.add(normalize(userTag));
        }

        List<String> missingTags = new ArrayList<>();

        for (String requiredTag : requiredTags) {
            if (!normalizedUserTags.contains(normalize(requiredTag))) {
                missingTags.add(requiredTag);
            }
        }

        return missingTags;
    }

    // 태그 문자열을 비교 가능한 형태로 정규화한다.
    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    // 레슨 완강률을 계산한다.
    private BigDecimal calculateLessonCompletionRate(long totalLessonCount, long completedLessonCount) {
        if (totalLessonCount == 0L) {
            return BigDecimal.valueOf(100.00).setScale(2, RoundingMode.HALF_UP);
        }

        return BigDecimal.valueOf((double) completedLessonCount * 100.0 / (double) totalLessonCount)
            .setScale(2, RoundingMode.HALF_UP);
    }

    // 퀴즈 통과 여부를 계산한다.
    private boolean hasQuizPassed(Long nodeId, Long userId) {
        Optional<NodeCompletionRule> completionRule = nodeCompletionRuleRepository.findByNodeNodeId(nodeId);

        if (completionRule.isEmpty()) {
            return true;
        }

        String criteriaType = completionRule.get().getCriteriaType();
        String criteriaValue = completionRule.get().getCriteriaValue();

        boolean quizRuleIncluded = containsIgnoreCase(criteriaType, "quiz")
            || containsIgnoreCase(criteriaValue, "quiz");

        if (!quizRuleIncluded) {
            return true;
        }

        List<Quiz> quizzes = quizRepository.findAllByRoadmapNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(nodeId)
            .stream()
            .filter(quiz -> Boolean.TRUE.equals(quiz.getIsActive()))
            .filter(quiz -> Boolean.TRUE.equals(quiz.getIsPublished()))
            .toList();

        if (quizzes.isEmpty()) {
            return false;
        }

        for (Quiz quiz : quizzes) {
            boolean passed = quizAttemptRepository
                .existsByQuizIdAndLearnerIdAndCompletedAtIsNotNullAndIsPassedTrueAndIsDeletedFalse(
                    quiz.getId(),
                    userId
                );

            if (!passed) {
                return false;
            }
        }

        return true;
    }

    // 과제 통과 여부를 계산한다.
    private boolean hasAssignmentPassed(Long nodeId, Long userId) {
        List<Assignment> assignments = assignmentRepository.findAllByRoadmapNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(nodeId);

        if (assignments.isEmpty()) {
            return true;
        }

        for (Assignment assignment : assignments) {
            Optional<Submission> latestSubmission = submissionRepository
                .findTopByAssignmentIdAndLearnerIdAndIsDeletedFalseOrderBySubmittedAtDesc(
                    assignment.getId(),
                    userId
                );

            if (latestSubmission.isEmpty()) {
                return false;
            }

            if (!isPassedSubmission(assignment, latestSubmission.get())) {
                return false;
            }
        }

        return true;
    }

    // 제출 1건이 통과 조건을 만족하는지 확인한다.
    private boolean isPassedSubmission(Assignment assignment, Submission submission) {
        if (!SubmissionStatus.GRADED.equals(submission.getSubmissionStatus())) {
            return false;
        }

        if (Boolean.TRUE.equals(assignment.getReadmeRequired())
            && !Boolean.TRUE.equals(submission.getReadmePassed())) {
            return false;
        }

        if (Boolean.TRUE.equals(assignment.getTestRequired())
            && !Boolean.TRUE.equals(submission.getTestPassed())) {
            return false;
        }

        if (Boolean.TRUE.equals(assignment.getLintRequired())
            && !Boolean.TRUE.equals(submission.getLintPassed())) {
            return false;
        }

        if (assignment.getAllowedFileFormats() != null
            && !assignment.getAllowedFileFormats().isBlank()
            && !Boolean.TRUE.equals(submission.getFileFormatPassed())) {
            return false;
        }

        return submission.getTotalScore() == null || submission.getTotalScore() > 0;
    }

    // 문자열에 특정 키워드가 포함되는지 확인한다.
    private boolean containsIgnoreCase(String source, String target) {
        if (source == null || source.isBlank()) {
            return false;
        }

        return source.toLowerCase(Locale.ROOT).contains(target.toLowerCase(Locale.ROOT));
    }

    // 판정 근거 목록을 생성한다.
    private List<ReasonResult> buildReasons(
        BigDecimal lessonCompletionRate,
        boolean requiredTagsSatisfied,
        List<String> missingTags,
        boolean quizPassed,
        boolean assignmentPassed,
        boolean proofEligible
    ) {
        List<ReasonResult> reasons = new ArrayList<>();

        reasons.add(
            ReasonResult.builder()
                .reasonType(ClearanceReasonType.LESSON_COMPLETION)
                .satisfied(lessonCompletionRate.compareTo(BigDecimal.valueOf(100.00)) >= 0)
                .detailMessage("레슨 완강률: " + lessonCompletionRate + "%")
                .build()
        );

        reasons.add(
            ReasonResult.builder()
                .reasonType(ClearanceReasonType.REQUIRED_TAGS)
                .satisfied(requiredTagsSatisfied)
                .detailMessage(requiredTagsSatisfied ? "필수 태그를 모두 보유하고 있습니다." : "필수 태그가 부족합니다.")
                .build()
        );

        reasons.add(
            ReasonResult.builder()
                .reasonType(ClearanceReasonType.MISSING_TAGS)
                .satisfied(missingTags.isEmpty())
                .detailMessage(missingTags.isEmpty() ? "부족한 태그가 없습니다." : String.join(", ", missingTags))
                .build()
        );

        reasons.add(
            ReasonResult.builder()
                .reasonType(ClearanceReasonType.QUIZ_PASS)
                .satisfied(quizPassed)
                .detailMessage(quizPassed ? "퀴즈 조건을 만족했습니다." : "퀴즈 통과 조건을 아직 만족하지 못했습니다.")
                .build()
        );

        reasons.add(
            ReasonResult.builder()
                .reasonType(ClearanceReasonType.ASSIGNMENT_PASS)
                .satisfied(assignmentPassed)
                .detailMessage(assignmentPassed ? "과제 조건을 만족했습니다." : "과제 통과 조건을 아직 만족하지 못했습니다.")
                .build()
        );

        reasons.add(
            ReasonResult.builder()
                .reasonType(ClearanceReasonType.PROOF_ELIGIBLE)
                .satisfied(proofEligible)
                .detailMessage(proofEligible ? "Proof Card 발급 가능 상태입니다." : "Proof Card 발급 조건이 아직 충족되지 않았습니다.")
                .build()
        );

        return reasons;
    }

    // 평가 결과 DTO다.
    @Getter
    @Builder
    public static class EvaluationResult {

        // 노드 ID다.
        private Long nodeId;

        // 노드 제목이다.
        private String nodeTitle;

        // 최종 클리어 상태다.
        private ClearanceStatus clearanceStatus;

        // 레슨 완강률이다.
        private BigDecimal lessonCompletionRate;

        // 필수 태그 충족 여부다.
        private boolean requiredTagsSatisfied;

        // 부족 태그 목록이다.
        private List<String> missingTags;

        // 레슨 완강 여부다.
        private boolean lessonCompleted;

        // 퀴즈 통과 여부다.
        private boolean quizPassed;

        // 과제 통과 여부다.
        private boolean assignmentPassed;

        // Proof 발급 가능 여부다.
        private boolean proofEligible;

        // 판정 근거 목록이다.
        private List<ReasonResult> reasons;
    }

    // 판정 근거 DTO다.
    @Getter
    @Builder
    public static class ReasonResult {

        // 판정 근거 유형이다.
        private ClearanceReasonType reasonType;

        // 충족 여부다.
        private boolean satisfied;

        // 상세 메시지다.
        private String detailMessage;
    }
}
