package com.devpath.api.qna.service;

import com.devpath.api.qna.dto.AnswerCreateRequest;
import com.devpath.api.qna.dto.AnswerResponse;
import com.devpath.api.qna.dto.DuplicateQuestionSuggestionResponse;
import com.devpath.api.qna.dto.QuestionCreateRequest;
import com.devpath.api.qna.dto.QuestionDetailResponse;
import com.devpath.api.qna.dto.QuestionSummaryResponse;
import com.devpath.api.qna.dto.QuestionTemplateResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.qna.entity.Answer;
import com.devpath.domain.qna.entity.Question;
import com.devpath.domain.qna.entity.QuestionTemplateType;
import com.devpath.domain.qna.repository.AnswerRepository;
import com.devpath.domain.qna.repository.QuestionRepository;
import com.devpath.domain.qna.repository.QuestionTemplateRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.text.Normalizer;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QnaService {

    private static final int DUPLICATE_SUGGESTION_LIMIT = 10;
    private static final int MAX_SEARCH_KEYWORDS = 5;
    private static final int MIN_MATCHED_KEYWORD_COUNT = 2;
    private static final double MIN_KEYWORD_MATCH_RATIO = 0.34;
    private static final Set<String> DUPLICATE_STOPWORDS = Set.of(
            "the", "and", "for", "with", "from",
            "이", "가", "은", "는", "을", "를", "에", "에서", "으로", "와", "과",
            "문제", "오류", "질문", "도움", "도와주세요", "해주세요", "관련"
    );

    private final QuestionRepository questionRepository;
    private final AnswerRepository answerRepository;
    private final QuestionTemplateRepository questionTemplateRepository;
    private final UserRepository userRepository;

    @Transactional
    public QuestionDetailResponse createQuestion(Long userId, QuestionCreateRequest request) {
        User user = getUser(userId);

        // 활성화된 템플릿 타입만 질문 작성에 사용할 수 있게 제한한다.
        validateTemplateType(request.getTemplateType());

        Question question = Question.builder()
                .user(user)
                .templateType(request.getTemplateType())
                .difficulty(request.getDifficulty())
                .title(request.getTitle())
                .content(request.getContent())
                .build();

        Question savedQuestion = questionRepository.save(question);
        return QuestionDetailResponse.from(savedQuestion, List.of());
    }

    public List<QuestionSummaryResponse> getQuestions() {
        return questionRepository.findAllByIsDeletedFalseOrderByCreatedAtDesc()
                .stream()
                .map(QuestionSummaryResponse::from)
                .toList();
    }

    @Transactional
    public QuestionDetailResponse getQuestionDetail(Long questionId) {
        Question question = getActiveQuestion(questionId);

        // 질문 상세 조회 시 조회수를 증가시킨다.
        question.incrementViewCount();

        List<AnswerResponse> answers = getAnswerResponses(questionId);
        return QuestionDetailResponse.from(question, answers);
    }

    @Transactional
    public AnswerResponse createAnswer(Long userId, Long questionId, AnswerCreateRequest request) {
        User user = getUser(userId);
        Question question = getActiveQuestion(questionId);

        Answer answer = Answer.builder()
                .question(question)
                .user(user)
                .content(request.getContent())
                .build();

        Answer savedAnswer = answerRepository.save(answer);
        return AnswerResponse.from(savedAnswer);
    }

    @Transactional
    public QuestionDetailResponse adoptAnswer(Long userId, Long questionId, Long answerId) {
        Question question = getActiveQuestion(questionId);

        // 질문 작성자 본인만 답변을 채택할 수 있다.
        validateQuestionOwner(userId, question);

        // 이미 채택된 답변이 있으면 중복 채택을 막는다.
        if (question.hasAdoptedAnswer()) {
            throw new CustomException(ErrorCode.ALREADY_ADOPTED);
        }

        Answer answer = answerRepository.findByQuestion_IdAndIdAndIsDeletedFalse(questionId, answerId)
                .orElseThrow(() -> new CustomException(ErrorCode.ANSWER_NOT_FOUND));

        // 자신의 답변은 채택할 수 없다.
        if (answer.getUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.CANNOT_ADOPT_OWN_ANSWER);
        }

        // 질문과 답변의 채택 상태를 함께 변경한다.
        answer.adopt();
        question.adoptAnswer(answer.getId());

        List<AnswerResponse> answers = getAnswerResponses(questionId);
        return QuestionDetailResponse.from(question, answers);
    }

    public List<QuestionTemplateResponse> getQuestionTemplates() {
        return questionTemplateRepository.findAllByIsActiveTrueOrderBySortOrderAscIdAsc()
                .stream()
                .map(QuestionTemplateResponse::from)
                .toList();
    }

    public List<DuplicateQuestionSuggestionResponse> getDuplicateSuggestions(String title) {
        String normalizedTitle = normalizeTitle(title);
        List<String> keywords = extractKeywords(normalizedTitle);

        if (keywords.isEmpty()) {
            return List.of();
        }

        Map<Long, ScoredSuggestion> scoredSuggestions = new LinkedHashMap<>();

        for (String keyword : keywords.stream().limit(MAX_SEARCH_KEYWORDS).toList()) {
            List<Question> matchedQuestions = questionRepository
                    .findTop10ByIsDeletedFalseAndTitleContainingIgnoreCaseOrderByCreatedAtDesc(keyword);

            for (Question matchedQuestion : matchedQuestions) {
                String normalizedCandidateTitle = normalizeTitle(matchedQuestion.getTitle());

                int matchedKeywordCount = countMatchedKeywords(normalizedCandidateTitle, keywords);
                double matchRatio = (double) matchedKeywordCount / keywords.size();

                boolean fullTitleSimilar = normalizedCandidateTitle.contains(normalizedTitle)
                        || normalizedTitle.contains(normalizedCandidateTitle);

                if (!fullTitleSimilar
                        && matchedKeywordCount < MIN_MATCHED_KEYWORD_COUNT
                        && matchRatio < MIN_KEYWORD_MATCH_RATIO) {
                    continue;
                }

                int score = calculateDuplicateScore(
                        normalizedTitle,
                        normalizedCandidateTitle,
                        keywords,
                        matchedKeywordCount,
                        fullTitleSimilar
                );

                String matchedKeyword = resolveMatchedKeyword(
                        normalizedCandidateTitle,
                        keywords,
                        fullTitleSimilar
                );

                scoredSuggestions.compute(
                        matchedQuestion.getId(),
                        (questionId, existing) -> {
                            if (existing == null) {
                                return new ScoredSuggestion(matchedQuestion, matchedKeyword, score);
                            }

                            if (score > existing.score()) {
                                return new ScoredSuggestion(matchedQuestion, matchedKeyword, score);
                            }

                            if (score == existing.score()
                                    && matchedQuestion.getCreatedAt().isAfter(existing.question().getCreatedAt())) {
                                return new ScoredSuggestion(matchedQuestion, matchedKeyword, score);
                            }

                            return existing;
                        }
                );
            }
        }

        return scoredSuggestions.values().stream()
                .sorted(Comparator
                        .comparingInt(ScoredSuggestion::score).reversed()
                        .thenComparing(s -> s.question().getCreatedAt(), Comparator.reverseOrder()))
                .limit(DUPLICATE_SUGGESTION_LIMIT)
                .map(s -> DuplicateQuestionSuggestionResponse.from(s.question(), s.matchedKeyword()))
                .toList();
    }

    // 활성화된 템플릿 타입인지 검증한다.
    private void validateTemplateType(QuestionTemplateType templateType) {
        boolean exists = questionTemplateRepository.existsByTemplateTypeAndIsActiveTrue(templateType);
        if (!exists) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "활성화되지 않은 질문 템플릿 타입입니다.");
        }
    }

    // 특정 질문의 답변 목록을 응답 DTO로 변환한다.
    private List<AnswerResponse> getAnswerResponses(Long questionId) {
        return answerRepository.findAllByQuestionIdAndIsDeletedFalseOrderByCreatedAtAsc(questionId)
                .stream()
                .map(AnswerResponse::from)
                .toList();
    }

    // 중복 추천용 제목 입력을 정규화한다.
    private String normalizeTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "중복 추천을 위한 title 값은 필수입니다.");
        }

        return Normalizer.normalize(title, Normalizer.Form.NFKC)
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^\\p{L}\\p{N}\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    // 불필요한 조사와 일반 단어를 제외한 검색 키워드를 추출한다.
    private List<String> extractKeywords(String normalizedTitle) {
        return List.of(normalizedTitle.split("\\s+")).stream()
                .map(String::trim)
                .filter(keyword -> !keyword.isBlank())
                .filter(keyword -> keyword.length() >= 2)
                .filter(keyword -> !DUPLICATE_STOPWORDS.contains(keyword))
                .distinct()
                .toList();
    }

    private int countMatchedKeywords(String normalizedCandidateTitle, List<String> keywords) {
        int count = 0;
        for (String keyword : keywords) {
            if (normalizedCandidateTitle.contains(keyword)) {
                count++;
            }
        }
        return count;
    }

    private int calculateDuplicateScore(
            String normalizedTitle,
            String normalizedCandidateTitle,
            List<String> keywords,
            int matchedKeywordCount,
            boolean fullTitleSimilar
    ) {
        int score = 0;

        if (fullTitleSimilar) {
            score += 100;
        }

        score += matchedKeywordCount * 15;

        if (normalizedCandidateTitle.equals(normalizedTitle)) {
            score += 50;
        }

        Set<String> inputWords = new HashSet<>(keywords);
        Set<String> candidateWords = new HashSet<>(extractKeywords(normalizedCandidateTitle));
        candidateWords.retainAll(inputWords);

        score += candidateWords.size() * 10;

        return score;
    }

    private String resolveMatchedKeyword(
            String normalizedCandidateTitle,
            List<String> keywords,
            boolean fullTitleSimilar
    ) {
        if (fullTitleSimilar) {
            return "title";
        }

        return keywords.stream()
                .filter(normalizedCandidateTitle::contains)
                .findFirst()
                .orElse("keyword");
    }

    // 사용자 존재 여부를 공통으로 검증한다.
    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    // 삭제되지 않은 질문만 조회 대상으로 허용한다.
    private Question getActiveQuestion(Long questionId) {
        return questionRepository.findByIdAndIsDeletedFalse(questionId)
                .orElseThrow(() -> new CustomException(ErrorCode.QUESTION_NOT_FOUND));
    }

    // 질문 작성자 본인만 채택할 수 있도록 검증한다.
    private void validateQuestionOwner(Long userId, Question question) {
        if (!question.getUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }
    }

    private record ScoredSuggestion(
            Question question,
            String matchedKeyword,
            int score
    ) {
    }
}
