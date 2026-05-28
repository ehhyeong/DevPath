import type {
  AssignmentPrecheckRequest,
  AssignmentPrecheckResponse,
  AssignmentSubmissionResponse,
  CreateSubmissionRequest,
  LearningAssignmentDraft,
  LearningCourseDetail,
  LearningLesson,
  LearningLessonProgress,
  LearningQuizDraft,
  QuizAttemptResultResponse,
  SubmissionHistoryItem,
} from './types/learning'

export type FlattenedLesson = LearningLesson & {
  sectionId: number
  sectionTitle: string
}

export type AssignmentFormState = {
  submissionText: string
  submissionUrl: string
  hasReadme: boolean
  testPassed: boolean
  lintPassed: boolean
  files: File[]
}

export type QuizAnswerState = Record<number, { selectedOptionId?: number; textAnswer?: string }>

export const PLAYER_SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const
export const DEFAULT_SAMPLE_VIDEO_DURATION_SECONDS = 5
export const DEFAULT_VIDEO_URL = '/samples/ocr-code-demo.mp4'

export const checklistItems: Array<{ key: 'hasReadme' | 'testPassed' | 'lintPassed'; label: string }> = [
  { key: 'hasReadme', label: 'README 포함' },
  { key: 'testPassed', label: '테스트 통과' },
  { key: 'lintPassed', label: '린트 통과' },
]

export const fallbackCourseDetail: LearningCourseDetail = {
  courseId: 999001,
  title: 'Spring Boot Intro',
  subtitle: '실전 학습 플레이어 샘플',
  description: '강의 재생, 커리큘럼 확인, 노트 작성, 과제와 퀴즈 연습을 한 화면에서 처리합니다.',
  status: 'PUBLISHED',
  price: 99000,
  originalPrice: 129000,
  currency: 'KRW',
  difficultyLevel: 'BEGINNER',
  language: 'ko',
  hasCertificate: true,
  thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80',
  introVideoUrl: DEFAULT_VIDEO_URL,
  videoAssetKey: 'fallback-learning-player',
  durationSeconds: DEFAULT_SAMPLE_VIDEO_DURATION_SECONDS * 2,
  prerequisites: ['Java 기초 문법', 'HTTP 기본기'],
  jobRelevance: ['Backend developer', 'Server engineer'],
  objectives: [
    { objectiveId: 1, objectiveText: 'Spring Boot? Java 湲곕낯 媛쒕뀗 ?뺤씤', displayOrder: 1 },
    { objectiveId: 2, objectiveText: '?숈뒿 ?뚮젅?댁뼱 諛?怨쇱젣 UI ?쒖뿰', displayOrder: 2 },
  ],
  targetAudiences: [
    { targetAudienceId: 1, audienceDescription: '諛깆뿏??怨듭? ?쒖옉?섍퀬 ?띿쓣 ???덈뒗 ?숈뒿??', displayOrder: 1 },
    { targetAudienceId: 2, audienceDescription: 'Spring Boot 而ㅻ━?섎읆 ?뚮쾭?쒕? ?뺤씤?섍퀬 ?쒖쓣 ???덈뒗 ?ъ슜??', displayOrder: 2 },
  ],
  tags: [
    { tagId: 1, tagName: 'Java', proficiencyLevel: 3 },
    { tagId: 2, tagName: 'Spring Boot', proficiencyLevel: 3 },
  ],
  isBookmarked: false,
  isEnrolled: false,
  instructor: {
    instructorId: 7,
    channelName: 'Hong Backend Lab',
    profileImage: null,
    headline: '실무 중심 Spring Boot 강의',
    specialties: ['Spring Boot', 'JPA', 'Security'],
    channelApiPath: null,
  },
  sections: [
    {
      sectionId: 101,
      title: 'Spring Core',
      description: 'DI, IoC, bean lifecycle basics',
      sortOrder: 1,
      isPublished: true,
      lessons: [
        {
          lessonId: 1001,
          title: 'Understanding DI and IoC',
          description: 'DI, IoC 개념과 스프링 컨테이너 동작을 이해합니다.',
          lessonType: 'VIDEO',
          videoUrl: DEFAULT_VIDEO_URL,
          videoAssetKey: 'fallback-learning-1001',
          thumbnailUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1200&q=80',
          durationSeconds: DEFAULT_SAMPLE_VIDEO_DURATION_SECONDS,
          isPreview: true,
          isPublished: true,
          sortOrder: 1,
          materials: [
            {
              materialId: 501,
              materialType: 'SLIDE',
              materialUrl: '/materials/spring-core.pdf',
              assetKey: 'materials/spring-core.pdf',
              originalFileName: 'spring-core.pdf',
              sortOrder: 0,
            },
          ],
        },
        {
          lessonId: 1002,
          title: 'Bean registration and lifecycle',
          description: 'Bean 생성과 라이프사이클 콜백 흐름을 정리합니다.',
          lessonType: 'VIDEO',
          videoUrl: DEFAULT_VIDEO_URL,
          videoAssetKey: 'fallback-learning-1002',
          thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80',
          durationSeconds: DEFAULT_SAMPLE_VIDEO_DURATION_SECONDS,
          isPreview: false,
          isPublished: true,
          sortOrder: 2,
          materials: [],
        },
      ],
    },
  ],
  news: [],
}

export function createDefaultProgress(lessonId: number): LearningLessonProgress {
  return {
    lessonId,
    progressPercent: 0,
    progressSeconds: 0,
    defaultPlaybackRate: 1,
    pipEnabled: false,
    isCompleted: false,
    lastWatchedAt: null,
  }
}

export function createDefaultAssignmentForm(): AssignmentFormState {
  return {
    submissionText: '',
    submissionUrl: '',
    hasReadme: true,
    testPassed: true,
    lintPassed: true,
    files: [],
  }
}

export function buildFallbackAssignment(lesson: FlattenedLesson | null, assignmentId: number | null): LearningAssignmentDraft {
  return {
    assignmentId,
    title: `${lesson?.title ?? '실습 과제'} 실습 과제`,
    description: '강의 내용을 정리한 README, 제출 링크, 테스트 결과를 함께 제출합니다.',
    submissionRuleDescription: 'README 포함, 테스트 통과, 린트 통과, 허용된 파일 형식 유지',
    totalScore: 100,
    allowedFileFormats: ['md', 'txt', 'zip', 'pdf'],
    dueLabel: '학습 중 언제든 제출 가능',
  }
}

export function buildFallbackQuiz(lesson: FlattenedLesson | null): LearningQuizDraft {
  return {
    quizId: null,
    title: `${lesson?.title ?? '핵심 개념'} 체크 퀴즈`,
    description: '현재 강의의 핵심 개념을 빠르게 점검합니다.',
    passScore: 70,
    questions: [
      {
        questionId: 9001,
        questionType: 'MULTIPLE_CHOICE',
        questionText: '스프링에서 DI의 핵심 목적에 가장 가까운 설명은 무엇인가요?',
        explanation: '객체 생성과 의존성 연결을 프레임워크가 관리해 결합도를 낮추는 것이 핵심입니다.',
        points: 50,
        options: [
          { optionId: 1, optionText: '모든 객체를 직접 new로 생성한다.' },
          { optionId: 2, optionText: '프레임워크가 객체 연결을 관리한다.' },
          { optionId: 3, optionText: 'DB 연결만 자동화한다.' },
          { optionId: 4, optionText: '모든 설정을 XML로 강제한다.' },
        ],
        correctOptionId: 2,
      },
    ],
  }
}

export function readNumberSearchParam(name: string) {
  const value = new URLSearchParams(window.location.search).get(name)
  const parsed = value ? Number(value) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function getFlattenedLessons(course: LearningCourseDetail) {
  return course.sections.flatMap((section) =>
    section.lessons.map((lesson) => ({
      ...lesson,
      sectionId: section.sectionId,
      sectionTitle: section.title,
    })),
  )
}

export function formatTime(value: number) {
  const safe = Math.max(0, Math.floor(value))
  const hour = Math.floor(safe / 3600)
  const minute = Math.floor((safe % 3600) / 60)
  const second = safe % 60
  return hour > 0
    ? `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
    : `${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
}

export function formatDurationLabel(value: number | null) {
  return value ? formatTime(value) : '--:--'
}

export function formatDateLabel(value: string | null) {
  if (!value) return '방금'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function normalizeCourseDetail(course: LearningCourseDetail): LearningCourseDetail {
  return {
    ...course,
    prerequisites: course.prerequisites ?? [],
    jobRelevance: course.jobRelevance ?? [],
    objectives: course.objectives ?? [],
    targetAudiences: course.targetAudiences ?? [],
    infoSections: course.infoSections ?? [],
    tags: course.tags ?? [],
    isBookmarked: course.isBookmarked ?? false,
    isEnrolled: course.isEnrolled ?? false,
    sections: (course.sections ?? []).map((section) => ({
      ...section,
      lessons: (section.lessons ?? []).map((lesson) => ({ ...lesson, materials: lesson.materials ?? [] })),
    })),
    news: course.news ?? [],
  }
}

export const getProgressStorageKey = (lessonId: number) => `devpath.learning.progress.${lessonId}`
export const getNotesStorageKey = (lessonId: number) => `devpath.learning.notes.${lessonId}`
export const getAssignmentHistoryStorageKey = (lessonId: number) => `devpath.learning.assignment-history.${lessonId}`
export const getQuizResultStorageKey = (lessonId: number) => `devpath.learning.quiz-result.${lessonId}`

export function readJsonStorage<T>(key: string, fallback: T) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJsonStorage(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function buildSubmissionFiles(files: File[]) {
  return files.map((file) => {
    const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? '' : ''
    return { fileName: file.name, fileUrl: `local-upload://${encodeURIComponent(file.name)}`, fileSize: file.size, fileType: extension }
  })
}

export function simulateAssignmentPrecheck(assignment: LearningAssignmentDraft, payload: AssignmentPrecheckRequest): AssignmentPrecheckResponse {
  const allowedFormats = new Set(assignment.allowedFileFormats.map((item) => item.toLowerCase()))
  const fileFormatPassed = payload.files.length === 0 || payload.files.every((file) => allowedFormats.has(file.fileType.toLowerCase()))
  const passed = payload.hasReadme && payload.testPassed && payload.lintPassed && fileFormatPassed
  const failedCount = [payload.hasReadme, payload.testPassed, payload.lintPassed, fileFormatPassed].filter((item) => !item).length
  return {
    passed,
    readmePassed: payload.hasReadme,
    testPassed: payload.testPassed,
    lintPassed: payload.lintPassed,
    fileFormatPassed,
    qualityScore: Math.max(40, 100 - failedCount * 18),
    message: passed ? '자동 검증을 통과했습니다.' : '검증에 실패한 항목이 있습니다.',
  }
}

export function simulateAssignmentSubmission(assignment: LearningAssignmentDraft, userId: number | null, payload: CreateSubmissionRequest): AssignmentSubmissionResponse {
  const precheck = simulateAssignmentPrecheck(assignment, payload)
  return {
    submissionId: Date.now(),
    assignmentId: assignment.assignmentId ?? Date.now(),
    learnerId: userId ?? 0,
    submissionStatus: 'SUBMITTED',
    isLate: false,
    submittedAt: new Date().toISOString(),
    qualityScore: precheck.qualityScore,
    totalScore: precheck.passed ? Math.min(100, (precheck.qualityScore ?? 80) - 2) : Math.max(45, (precheck.qualityScore ?? 60) - 20),
    fileCount: payload.files.length,
    individualFeedback: 'AI 코드 리뷰어가 제출 내용을 기준으로 자동 피드백을 생성했습니다.',
    commonFeedback: '루브릭 기준 자동 채점 결과입니다.',
  }
}

export function simulateQuizAttempt(quiz: LearningQuizDraft, answers: QuizAnswerState): QuizAttemptResultResponse {
  const questionResults = quiz.questions.map((question) => {
    const answer = answers[question.questionId]
    const selectedOption = question.options.find((option) => option.optionId === answer?.selectedOptionId) ?? null
    const normalizedTextAnswer = answer?.textAnswer?.trim().toLowerCase() ?? ''
    const normalizedCorrectAnswer = question.correctAnswerText?.trim().toLowerCase() ?? ''
    const correct = question.questionType === 'MULTIPLE_CHOICE'
      ? answer?.selectedOptionId === question.correctOptionId
      : normalizedTextAnswer.length > 0 && normalizedTextAnswer === normalizedCorrectAnswer
    return {
      questionId: question.questionId,
      questionType: question.questionType,
      questionText: question.questionText,
      correct,
      earnedPoints: correct ? question.points : 0,
      selectedOptionId: selectedOption?.optionId ?? null,
      selectedOptionText: selectedOption?.optionText ?? null,
      textAnswer: answer?.textAnswer ?? null,
      correctAnswerText: question.questionType === 'MULTIPLE_CHOICE'
        ? question.options.find((option) => option.optionId === question.correctOptionId)?.optionText ?? null
        : question.correctAnswerText ?? null,
      explanation: question.explanation,
    }
  })
  const maxScore = quiz.questions.reduce((sum, question) => sum + question.points, 0)
  const score = questionResults.reduce((sum, question) => sum + (question.earnedPoints ?? 0), 0)
  return {
    attemptId: Date.now(),
    quizId: quiz.quizId ?? 0,
    quizTitle: quiz.title,
    score,
    maxScore,
    passed: maxScore > 0 ? Math.round((score / maxScore) * 100) >= quiz.passScore : false,
    attemptNumber: 1,
    completedAt: new Date().toISOString(),
    questionResults,
  }
}

export function toHistoryItem(assignment: LearningAssignmentDraft, submission: AssignmentSubmissionResponse): SubmissionHistoryItem {
  return {
    submissionId: submission.submissionId,
    assignmentId: submission.assignmentId,
    assignmentTitle: assignment.title,
    submissionStatus: submission.submissionStatus,
    qualityScore: submission.qualityScore,
    totalScore: submission.totalScore,
    isLate: submission.isLate,
    submittedAt: submission.submittedAt,
  }
}

export const resolveMaterialDownloadHref = (lessonId: number, materialId: number) =>
  `/api/learning/lessons/${lessonId}/materials/${materialId}/download`

export function syncLearningUrl(courseId: number, lessonId: number | null) {
  const params = new URLSearchParams(window.location.search)
  params.set('courseId', String(courseId))
  if (lessonId) params.set('lessonId', String(lessonId))
  const nextUrl = `${window.location.pathname}?${params.toString()}`
  window.history.replaceState({}, '', nextUrl)
}
