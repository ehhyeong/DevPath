import { startTransition, useCallback, useDeferredValue, useEffect, useEffectEvent, useMemo, useRef, useState, type DragEvent } from 'react'
import { courseApi, learnerAssignmentApi, learningPlayerApi, lessonNoteApi, lessonSessionApi, nodeClearanceApi, qnaApi } from '../../lib/api/learner'
import { readStoredAuthSession } from '../../lib/auth-session'
import { captureAndOcr, warmupOcrWorker, type ScreenRegion } from '../../lib/videoOcr'
import type { AuthSession } from '../../types/auth'
import type { LearningCourseDetail, LearningLesson, LearningLessonProgress, LearningPlayerConfig, LearningVideoQuality, SubmissionHistoryItem, TimestampNote } from '../../types/learning'
import type { CreateQnaQuestionRequest, QnaQuestionDetail, QnaQuestionSummary, QnaQuestionTemplate } from '../../types/qna'
import { ASSIGNMENT_LOADING_MESSAGES, buildAssignmentResultReportRows, buildAssignmentSubmissionPayload, buildCelebrationParticles, buildCompletionProofCard, buildQnaRealtimeWebSocketUrl, buildQuizModalQuestions, clampPercent, COURSE_LOAD_TIMEOUT_MS, createAssignmentFormState, createDefaultPlayerConfig, createQuestionFormState, formatOcrSourceLabel, getAvailableVideoQuality, getProofCardTheme, getVideoErrorMessage, isAbortError, isAssignmentLesson, isAssignmentSubmissionFormReady, isCourse127DemoCourse, isLessonProgressCompleted, isNativeKeyboardControlTarget, isOwnQnaQuestion, isPlaybackBlockedError, isQuestionAnswered, isQuizLesson, isSampleVideoUrl, LESSON_LOAD_TIMEOUT_MS, QNA_LOAD_TIMEOUT_MS, readEnabledSearchParam, readNonNegativeNumberSearchParam, readOptionalSafeReturnHref, readSafeReturnHref, readStudentPreviewFromLocation, readVideoDuration, requestWithTimeout, resolveAssignmentHistoryScorePercent, resolveAssignmentResultBadge, resolveAssignmentResultPassed, resolveAssignmentResultScore, resolveAssignmentResultScorePercent, resolveAssignmentReviewFeedback, resolveAssignmentSubmissionEmptyMessage, resolveAssignmentSubmissionMethods, resolveLessonAssignment, resolveVideoQualitySources, resolveVideoUrl, toQuestionSummary, type AssignmentGradingResultState, type AssignmentSubmissionFormState, type CompletionProofCardState, type PersistCompletionOptions, type PipDocument, type PipVideoElement, type QnaRealtimeEvent, type QnaStatusFilter, type QuestionFormState, type TabKey } from './learning-player-model'
import { createDefaultProgress, formatTime, getFlattenedLessons, getNotesStorageKey, getProgressStorageKey, normalizeCourseDetail, PLAYER_SPEEDS, readJsonStorage, readNumberSearchParam, writeJsonStorage } from './learning-player-support'
import { useLearningPlayerEnvironment } from './useLearningPlayerEnvironment'

export function useLearningPlayerController() {
const initialCourseId = useMemo(() => readNumberSearchParam('courseId'), [])
  const initialLessonId = useMemo(() => readNumberSearchParam('lessonId'), [])
  const isStudentPreview = useMemo(() => readStudentPreviewFromLocation(), [])
  const initialTimestampSeconds = useMemo(() => readNonNegativeNumberSearchParam('t'), [])
  const shouldAutoplayPreview = useMemo(() => isStudentPreview && readEnabledSearchParam('autoplay'), [isStudentPreview])

  const [session, setSession] = useState<AuthSession | null>(() => readStoredAuthSession())
  const [course, setCourse] = useState<LearningCourseDetail | null>(null)
  const [courseError, setCourseError] = useState<string | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(initialLessonId)
  const [activeTab, setActiveTab] = useState<TabKey>('curriculum')
  const [openSectionIds, setOpenSectionIds] = useState<Set<number>>(() => new Set())
  const [notice, setNotice] = useState<string | null>(null)
  const [loadingCourse, setLoadingCourse] = useState(true)
  const [loadingLesson, setLoadingLesson] = useState(false)
  const [loadingLessonProgressMap, setLoadingLessonProgressMap] = useState(false)
  const [progress, setProgress] = useState<LearningLessonProgress | null>(null)
  const [lessonProgressById, setLessonProgressById] = useState<Record<number, LearningLessonProgress>>({})
  const [playerConfig, setPlayerConfig] = useState<LearningPlayerConfig | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedVideoQuality, setSelectedVideoQuality] = useState<LearningVideoQuality>('1080')
  const [notes, setNotes] = useState<TimestampNote[]>([])
  const [noteContent, setNoteContent] = useState('')
  const [noteComposerOpen, setNoteComposerOpen] = useState(false)
  const [noteMessage, setNoteMessage] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [actualDurationByLessonId, setActualDurationByLessonId] = useState<Record<number, number>>({})
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isPipActive, setIsPipActive] = useState(false)
  const [isFrameFullscreen, setIsFrameFullscreen] = useState(false)
  const [ocrBusy, setOcrBusy] = useState(false)
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectDrag, setSelectDrag] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null)
  const [videoFailed, setVideoFailed] = useState(false)
  const [qnaTemplates, setQnaTemplates] = useState<QnaQuestionTemplate[]>([])
  const [qnaQuestions, setQnaQuestions] = useState<QnaQuestionSummary[]>([])
  const [qnaDetails, setQnaDetails] = useState<Record<number, QnaQuestionDetail>>({})
  const [loadingQna, setLoadingQna] = useState(false)
  const [qnaError, setQnaError] = useState<string | null>(null)
  const [qnaStatusFilter, setQnaStatusFilter] = useState<QnaStatusFilter>('ALL')
  const [qnaSearch, setQnaSearch] = useState('')
  const [openQuestionId, setOpenQuestionId] = useState<number | null>(null)
  const [loadingQuestionId, setLoadingQuestionId] = useState<number | null>(null)
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(createQuestionFormState)
  const [questionMessage, setQuestionMessage] = useState<string | null>(null)
  const [questionBusy, setQuestionBusy] = useState(false)
  const [questionComposerOpen, setQuestionComposerOpen] = useState(false)
  const [openNoteId, setOpenNoteId] = useState<number | null>(null)
  const [editingNoteContent, setEditingNoteContent] = useState('')
  const [quizModalLessonId, setQuizModalLessonId] = useState<number | null>(null)
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0)
  const [quizSelectedOptionIndex, setQuizSelectedOptionIndex] = useState<number | null>(null)
  const [quizFeedback, setQuizFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [assignmentModalLessonId, setAssignmentModalLessonId] = useState<number | null>(null)
  const [assignmentForm, setAssignmentForm] = useState<AssignmentSubmissionFormState>(() => createAssignmentFormState())
  const [assignmentFileDragActive, setAssignmentFileDragActive] = useState(false)
  const [assignmentSubmitBusy, setAssignmentSubmitBusy] = useState(false)
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null)
  const [assignmentLoadingVisible, setAssignmentLoadingVisible] = useState(false)
  const [assignmentLoadingText, setAssignmentLoadingText] = useState(ASSIGNMENT_LOADING_MESSAGES[0])
  const [assignmentGradingResult, setAssignmentGradingResult] = useState<AssignmentGradingResultState | null>(null)
  const [assignmentHistoryByAssignmentId, setAssignmentHistoryByAssignmentId] = useState<Record<number, SubmissionHistoryItem>>({})
  const [completionProofCard, setCompletionProofCard] = useState<CompletionProofCardState | null>(null)
  const [completionVisible, setCompletionVisible] = useState(false)
  const [completionCardFlipped, setCompletionCardFlipped] = useState(false)
  const [completionBurstKey, setCompletionBurstKey] = useState(0)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const resumeTimeRef = useRef(0)
  const lastRenderedSecondRef = useRef(-1)
  const pendingVideoLoadRef = useRef(false)
  const resumePlaybackAfterQualitySwitchRef = useRef(false)
  const previewAutoplayLessonIdRef = useRef<number | null>(null)
  const completedPersistedLessonIdRef = useRef<number | null>(null)
  const courseCompletionShownRef = useRef<number | null>(null)
  const lessonProgressByIdRef = useRef<Record<number, LearningLessonProgress>>({})
  const quizScoreByLessonIdRef = useRef<Record<number, number>>({})
  const openQuestionIdRef = useRef<number | null>(null)
  const qnaDetailsRef = useRef<Record<number, QnaQuestionDetail>>({})

  const lessons = useMemo(() => (course ? getFlattenedLessons(course) : []), [course])
  const courseProgressPercent = useMemo(() => {
    if (!lessons.length) return 0
    const total = lessons.reduce((sum, item) => {
      const itemProgress = lessonProgressById[item.lessonId]
      return sum + clampPercent(itemProgress?.progressPercent ?? 0)
    }, 0)
    return Math.round(total / lessons.length)
  }, [lessons, lessonProgressById])
  const resolveInitialPlaybackSeconds = useCallback((lessonId: number, fallbackSeconds: number) => {
    if (initialTimestampSeconds === null) {
      return fallbackSeconds
    }

    if (initialLessonId && initialLessonId !== lessonId) {
      return fallbackSeconds
    }

    return initialTimestampSeconds
  }, [initialLessonId, initialTimestampSeconds])

  const lessonLockMap = useMemo(() => {
    const locks = new Map<number, { locked: boolean; prerequisiteLessonId: number | null; prerequisiteLessonTitle: string | null }>()
    if (!course) return locks
    if (isStudentPreview) {
      lessons.forEach((item) => {
        locks.set(item.lessonId, { locked: false, prerequisiteLessonId: null, prerequisiteLessonTitle: null })
      })
      return locks
    }

    let previousLesson: LearningLesson | null = null
    course.sections.forEach((section) => {
      section.lessons.forEach((item) => {
        if (!previousLesson) {
          locks.set(item.lessonId, { locked: false, prerequisiteLessonId: null, prerequisiteLessonTitle: null })
          previousLesson = item
          return
        }

        const previousProgress = lessonProgressById[previousLesson.lessonId]
        locks.set(item.lessonId, {
          locked: !isLessonProgressCompleted(previousProgress),
          prerequisiteLessonId: previousLesson.lessonId,
          prerequisiteLessonTitle: previousLesson.title,
        })
        previousLesson = item
      })
    })

    return locks
  }, [course, isStudentPreview, lessonProgressById, lessons])
  const firstUnlockedLessonId = useMemo(
    () => lessons.find((item) => !lessonLockMap.get(item.lessonId)?.locked)?.lessonId ?? null,
    [lessonLockMap, lessons],
  )
  const lesson = useMemo(
    () => lessons.find((item) => item.lessonId === selectedLessonId) ?? lessons[0] ?? null,
    [lessons, selectedLessonId],
  )
  const selectedLessonIndex = useMemo(
    () => (lesson ? lessons.findIndex((item) => item.lessonId === lesson.lessonId) : -1),
    [lesson, lessons],
  )
  const previousLesson = selectedLessonIndex > 0 ? lessons[selectedLessonIndex - 1] : null
  const nextLesson = selectedLessonIndex >= 0 && selectedLessonIndex < lessons.length - 1 ? lessons[selectedLessonIndex + 1] : null
  const selectedLessonLock = selectedLessonId ? lessonLockMap.get(selectedLessonId) : null
  const selectedLessonLocked = Boolean(selectedLessonLock?.locked)
  const videoQualitySources = useMemo(
    () => (selectedLessonLocked ? {} : resolveVideoQualitySources(lesson, course)),
    [course, lesson, selectedLessonLocked],
  )
  const activeVideoQuality = getAvailableVideoQuality(selectedVideoQuality, videoQualitySources)
  const resolvedVideoUrl = activeVideoQuality ? resolveVideoUrl(videoQualitySources[activeVideoQuality] ?? null) : null
  const shouldResumePlayback = lesson ? !isSampleVideoUrl(videoQualitySources[activeVideoQuality ?? '1080'] ?? lesson.videoUrl) : true
  const selectedLessonAssignment = resolveLessonAssignment(lesson)
  const selectedLessonHasAssignment = Boolean(selectedLessonAssignment)
  const selectedLessonIsQuiz = isQuizLesson(lesson)
  const quizModalLesson = quizModalLessonId ? lessons.find((item) => item.lessonId === quizModalLessonId) ?? null : null
  const quizModalQuestions = useMemo(
    () => (course && quizModalLesson ? buildQuizModalQuestions(quizModalLesson) : []),
    [course, quizModalLesson],
  )
  const activeQuizQuestion = quizModalQuestions[quizQuestionIndex] ?? quizModalQuestions[0] ?? null
  const assignmentModalLesson = assignmentModalLessonId ? lessons.find((item) => item.lessonId === assignmentModalLessonId) ?? null : null
  const assignmentModal = resolveLessonAssignment(assignmentModalLesson)
  const assignmentModalMethods = resolveAssignmentSubmissionMethods(assignmentModal)
  const assignmentSubmitDisabled =
    assignmentSubmitBusy || !assignmentModal || !isAssignmentSubmissionFormReady(assignmentModal, assignmentForm)
  const assignmentGradingScore = assignmentGradingResult
    ? resolveAssignmentResultScore(assignmentGradingResult.submission)
    : null
  const assignmentGradingFeedback = assignmentGradingResult
    ? resolveAssignmentReviewFeedback(assignmentGradingResult.submission)
    : null
  const assignmentGradingPassed = assignmentGradingResult
    ? resolveAssignmentResultPassed(
      assignmentGradingResult.assignment,
      assignmentGradingResult.submission,
    )
    : null
  const assignmentGradingBadge = assignmentGradingResult
    ? resolveAssignmentResultBadge(
      assignmentGradingResult.assignment,
      assignmentGradingResult.submission,
    )
    : null
  const assignmentGradingReportRows = assignmentGradingResult
    ? buildAssignmentResultReportRows(
      assignmentGradingResult.assignment,
      assignmentGradingResult.submission,
      assignmentGradingResult.precheck,
    )
    : []
  const assignmentResultLessonIndex = assignmentGradingResult
    ? lessons.findIndex((item) => item.lessonId === assignmentGradingResult.lessonId)
    : -1
  const assignmentResultNextLesson = assignmentResultLessonIndex >= 0 && assignmentResultLessonIndex < lessons.length - 1
    ? lessons[assignmentResultLessonIndex + 1]
    : null
  const assignmentResultProgressById = useMemo(() => {
    if (!assignmentGradingResult) return lessonProgressById
    const currentProgress = lessonProgressById[assignmentGradingResult.lessonId]
      ?? createDefaultProgress(assignmentGradingResult.lessonId)
    return {
      ...lessonProgressById,
      [assignmentGradingResult.lessonId]: {
        ...currentProgress,
        progressPercent: 100,
        isCompleted: true,
      },
    }
  }, [assignmentGradingResult, lessonProgressById])

  useEffect(() => {
    if (!course || !lesson) return

    const activeSection = course.sections.find((section) => (
      section.lessons.some((item) => item.lessonId === lesson.lessonId)
    ))
    if (!activeSection) return

    setOpenSectionIds((current) => {
      if (current.has(activeSection.sectionId)) return current
      const next = new Set(current)
      next.add(activeSection.sectionId)
      return next
    })
  }, [course, lesson])
  const assignmentResultCompletesCourse = assignmentGradingResult
    ? lessons.length > 0 && lessons.every((item) => isLessonProgressCompleted(assignmentResultProgressById[item.lessonId]))
    : false
  const assignmentResultPrimaryActionLabel = assignmentResultCompletesCourse
    ? '학습 완료 및 증명 카드 발급'
    : assignmentResultNextLesson
      ? '다음 강의로 이동'
      : '계속 학습하기'
  const assignmentResultPrimaryActionIcon = assignmentResultCompletesCourse
    ? 'fa-certificate'
    : assignmentResultNextLesson
      ? 'fa-arrow-right'
      : 'fa-book-open'
  useEffect(() => {
    if (!activeVideoQuality || selectedVideoQuality === activeVideoQuality) return
    setSelectedVideoQuality(activeVideoQuality)
  }, [activeVideoQuality, selectedVideoQuality])
  useEffect(() => {
    if (!course || !lessons.length) return

    const controller = new AbortController()
    lessons.forEach((item) => {
      const sources = resolveVideoQualitySources(item, course)
      const source = sources[selectedVideoQuality] ?? sources['1080'] ?? sources['720'] ?? item.videoUrl
      if (!source) return

      readVideoDuration(resolveVideoUrl(source) ?? source, controller.signal, (durationSeconds) => {
        setActualDurationByLessonId((current) => (
          current[item.lessonId] === durationSeconds
            ? current
            : { ...current, [item.lessonId]: durationSeconds }
        ))
      })
    })

    return () => controller.abort()
  }, [course, lessons, selectedVideoQuality])
  const completionTheme = completionProofCard ? getProofCardTheme(completionProofCard.type) : null
  const completionParticles = useMemo(() => buildCelebrationParticles(completionBurstKey), [completionBurstKey])
  const sessionUserId = session?.userId ?? null
  const selectedAssignmentHistory = selectedLessonAssignment && selectedLessonAssignment.assignmentId > 0
    ? assignmentHistoryByAssignmentId[selectedLessonAssignment.assignmentId] ?? null
    : null
  const courseDetailHref = initialCourseId
    ? `/course-detail?courseId=${course?.courseId ?? initialCourseId}`
    : '/lecture-list'
  const sourceReturnHref = useMemo(() => readOptionalSafeReturnHref(), [])
  const learningBackHref = sourceReturnHref ?? courseDetailHref
  const completionRoadmapReturnHref = sourceReturnHref ?? '/roadmap-hub'
  const studentPreviewReturnHref = useMemo(
    () => readSafeReturnHref(courseDetailHref),
    [courseDetailHref],
  )
  const deferredQnaSearch = useDeferredValue(qnaSearch.trim().toLowerCase())
  const templateOptions = useMemo(
    () => [...qnaTemplates].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [qnaTemplates],
  )
  const selectedTemplate = useMemo(
    () => templateOptions.find((item) => item.templateType === questionForm.templateType) ?? null,
    [questionForm.templateType, templateOptions],
  )
  const visibleQuestions = useMemo(() => (
    qnaQuestions.filter((item) => {
      const answered = isQuestionAnswered(item)
      const statusMatched = qnaStatusFilter === 'ALL'
        || (qnaStatusFilter === 'MINE' && isOwnQnaQuestion(item, sessionUserId))
        || (qnaStatusFilter === 'UNANSWERED' && !answered)
      const searchTarget = [item.authorName, item.title, item.lectureTimestamp ?? '', qnaDetails[item.id]?.content ?? '']
        .join(' ')
        .toLowerCase()
      return statusMatched && (!deferredQnaSearch || searchTarget.includes(deferredQnaSearch))
    })
  ), [deferredQnaSearch, qnaDetails, qnaQuestions, qnaStatusFilter, sessionUserId])
  const refreshQnaQuestion = useCallback(async (questionId: number, options?: { showLoading?: boolean }) => {
    if (options?.showLoading) {
      setLoadingQuestionId(questionId)
    }

    try {
      const detail = await qnaApi.getQuestionDetail(questionId)
      setQnaDetails((current) => ({ ...current, [questionId]: detail }))
      setQnaQuestions((current) => current.map((item) => (item.id === questionId ? toQuestionSummary(detail) : item)))
    } catch {
      setQnaError('吏덈Ц ?곸꽭 ?뺣낫瑜?遺덈윭?ㅼ? 紐삵뻽?듬땲??')
    } finally {
      if (options?.showLoading) {
        setLoadingQuestionId((current) => (current === questionId ? null : current))
      }
    }
  }, [])

  const getPlaybackLimit = useCallback((video: HTMLVideoElement | null) => {
    // Math.floor 제거 — float 그대로 사용해야 영상 끝에서 강제 정지되지 않음
    const metadataDuration = video && Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0
    // declaredDuration으로 cap하지 않음 — 실제 영상 길이를 우선
    return metadataDuration || (lesson?.durationSeconds ?? 0)
  }, [lesson?.durationSeconds])

  const mergeLessonProgress = useCallback((
    lessonId: number,
    nextProgress: LearningLessonProgress,
    currentProgress?: LearningLessonProgress | null,
  ) => {
    const wasCompleted = isLessonProgressCompleted(currentProgress)
    const isCompleted = wasCompleted || isLessonProgressCompleted(nextProgress)

    return {
      ...nextProgress,
      lessonId,
      isCompleted,
    }
  }, [])

  const isCourseCompletedByProgress = useCallback((progressByLessonId: Record<number, LearningLessonProgress>) => (
    lessons.length > 0 && lessons.every((item) => isLessonProgressCompleted(progressByLessonId[item.lessonId]))
  ), [lessons])

  const calculateCourseCompletionScore = useCallback((
    progressByLessonId: Record<number, LearningLessonProgress>,
    latestAssignmentResult?: AssignmentGradingResultState | null,
  ) => {
    const quizScores = lessons
      .filter(isQuizLesson)
      .map((item) => {
        const recordedScore = quizScoreByLessonIdRef.current[item.lessonId]
        if (recordedScore !== undefined) return clampPercent(recordedScore)
        return isLessonProgressCompleted(progressByLessonId[item.lessonId]) ? 100 : null
      })
      .filter((score): score is number => score !== null)
    const assignmentScores = new Map<number, number>()

    lessons.forEach((item) => {
      const assignment = resolveLessonAssignment(item)
      if (!assignment || assignment.assignmentId <= 0) return

      const historyScore = resolveAssignmentHistoryScorePercent(
        assignment,
        assignmentHistoryByAssignmentId[assignment.assignmentId],
      )
      if (historyScore !== null) {
        assignmentScores.set(assignment.assignmentId, historyScore)
      }
    })

    if (latestAssignmentResult) {
      const latestScore = resolveAssignmentResultScorePercent(
        latestAssignmentResult.assignment,
        latestAssignmentResult.submission,
      )
      if (latestScore !== null) {
        assignmentScores.set(latestAssignmentResult.assignment.assignmentId, latestScore)
      }
    }

    const assignmentScoreValues = [...assignmentScores.values()]
    if (isCourse127DemoCourse(course) && assignmentScoreValues.length) {
      return clampPercent(
        assignmentScoreValues.reduce((sum, item) => sum + item, 0) / assignmentScoreValues.length,
      )
    }

    const evaluationAverages = [
      quizScores.length ? quizScores.reduce((sum, item) => sum + item, 0) / quizScores.length : null,
      assignmentScoreValues.length
        ? assignmentScoreValues.reduce((sum, item) => sum + item, 0) / assignmentScoreValues.length
        : null,
    ].filter((score): score is number => score !== null)

    if (!evaluationAverages.length) return 0
    return clampPercent(evaluationAverages.reduce((sum, item) => sum + item, 0) / evaluationAverages.length)
  }, [assignmentHistoryByAssignmentId, course, lessons])

  const openCourseCompletionOverlay = useCallback((
    progressByLessonId: Record<number, LearningLessonProgress>,
    latestAssignmentResult?: AssignmentGradingResultState | null,
  ) => {
    if (!course || !isCourseCompletedByProgress(progressByLessonId)) return
    if (courseCompletionShownRef.current === course.courseId) return

    courseCompletionShownRef.current = course.courseId
    const finalLesson = lessons[lessons.length - 1] ?? null
    const finalAssignment = latestAssignmentResult?.assignment ?? resolveLessonAssignment(finalLesson)
    const score = calculateCourseCompletionScore(progressByLessonId, latestAssignmentResult)
    const proofCard = buildCompletionProofCard(course, finalLesson, finalAssignment, score)

    setCompletionProofCard(proofCard)
    setCompletionCardFlipped(false)
    setCompletionVisible(true)
    setCompletionBurstKey((current) => current + 1)

    // 강의 완료 시 매핑된 노드 클리어 재계산 → 프루프카드 자동 발급 (진입 경로 무관)
    if (course.courseId) {
      void nodeClearanceApi
        .recalculateByCourse(course.courseId)
        .catch(() => undefined)
    }
  }, [calculateCourseCompletionScore, course, isCourseCompletedByProgress, lessons])

  const persistCompletedLesson = useCallback((
    lessonId: number,
    totalSeconds: number,
    options: PersistCompletionOptions = {},
  ) => {
    if (isStudentPreview) return
    if (completedPersistedLessonIdRef.current === lessonId) return
    completedPersistedLessonIdRef.current = lessonId

    const progressSeconds = Math.max(0, Math.floor(totalSeconds))
    const nextProgress: LearningLessonProgress = {
      lessonId,
      progressPercent: 100,
      progressSeconds,
      defaultPlaybackRate: playerConfig?.defaultPlaybackRate ?? 1,
      pipEnabled: playerConfig?.pipEnabled ?? false,
      isCompleted: true,
      lastWatchedAt: new Date().toISOString(),
    }

    setProgress((current) => (current?.lessonId === lessonId ? mergeLessonProgress(lessonId, nextProgress, current) : current))
    const mergedProgress = mergeLessonProgress(lessonId, nextProgress, lessonProgressByIdRef.current[lessonId])
    const nextProgressById = {
      ...lessonProgressByIdRef.current,
      [lessonId]: mergedProgress,
    }
    lessonProgressByIdRef.current = nextProgressById
    setLessonProgressById(nextProgressById)
    if (options.showCourseCompletion !== false) {
      openCourseCompletionOverlay(nextProgressById)
    }
    writeJsonStorage(getProgressStorageKey(lessonId), nextProgress)

    void lessonSessionApi
      .saveProgress(lessonId, { progressPercent: 100, progressSeconds })
      .then((savedProgress) => {
        const mergedSavedProgress = mergeLessonProgress(lessonId, savedProgress, nextProgress)
        setProgress((current) => (current?.lessonId === lessonId ? mergedSavedProgress : current))
        const savedProgressById = {
          ...lessonProgressByIdRef.current,
          [lessonId]: mergeLessonProgress(
            lessonId,
            mergedSavedProgress,
            lessonProgressByIdRef.current[lessonId],
          ),
        }
        lessonProgressByIdRef.current = savedProgressById
        setLessonProgressById(savedProgressById)
        writeJsonStorage(getProgressStorageKey(lessonId), mergedSavedProgress)
      })
      .catch(() => {
        completedPersistedLessonIdRef.current = null
      })
  }, [
    isStudentPreview,
    mergeLessonProgress,
    openCourseCompletionOverlay,
    playerConfig?.defaultPlaybackRate,
    playerConfig?.pipEnabled,
  ])

  useEffect(() => {
    lessonProgressByIdRef.current = lessonProgressById
  }, [lessonProgressById])

  useEffect(() => {
    openQuestionIdRef.current = openQuestionId
  }, [openQuestionId])

  useEffect(() => {
    qnaDetailsRef.current = qnaDetails
  }, [qnaDetails])

  useEffect(() => {
    courseCompletionShownRef.current = null
  }, [course?.courseId])

  useLearningPlayerEnvironment({ course, lesson, setSession, setAssignmentMessage })

  useEffect(() => {
    if (!session) {
      setLoadingCourse(false)
      return
    }
    let cancelled = false

    async function loadCourse() {
      setLoadingCourse(true)
      setCourseError(null)
      if (!initialCourseId) {
        setCourse(null)
        setCourseError('courseId가 없습니다.')
        setLoadingCourse(false)
        return
      }
      try {
        const response = await requestWithTimeout(COURSE_LOAD_TIMEOUT_MS, (signal) => courseApi.getCourseDetail(initialCourseId, signal))
        if (cancelled) return
        const normalizedCourse = normalizeCourseDetail(response)
        const nextLessons = getFlattenedLessons(normalizedCourse)
        if (!nextLessons.length) {
          setCourse(null)
          setCourseError('이 강의에는 공개된 강의 영상이 없습니다.')
          return
        }
        setCourse(normalizedCourse)
        setSelectedLessonId(
          (initialLessonId && nextLessons.some((item) => item.lessonId === initialLessonId))
            ? initialLessonId
            : nextLessons[0].lessonId,
        )
      } catch (error) {
        if (cancelled) return
        setCourse(null)
        setCourseError(isAbortError(error) ? '강의 데이터를 불러오는 데 시간이 초과됐습니다.' : '강의 데이터를 불러오지 못했습니다.')
      } finally {
        if (!cancelled) setLoadingCourse(false)
      }
    }

    void loadCourse()
    return () => { cancelled = true }
  }, [initialCourseId, initialLessonId, session])

  useEffect(() => {
    if (!session || !lessons.length) {
      setLessonProgressById({})
      setLoadingLessonProgressMap(false)
      return
    }

    if (isStudentPreview) {
      setLessonProgressById(Object.fromEntries(
        lessons.map((item) => [item.lessonId, createDefaultProgress(item.lessonId)]),
      ))
      setLoadingLessonProgressMap(false)
      return
    }

    let cancelled = false

    async function loadLessonProgressMap() {
      setLoadingLessonProgressMap(true)
      const progressEntries = await Promise.all(
        lessons.map(async (item) => {
          try {
            const nextProgress = await requestWithTimeout(
              LESSON_LOAD_TIMEOUT_MS,
              (signal) => lessonSessionApi.getProgress(item.lessonId, signal),
            )
            return [item.lessonId, nextProgress] as const
          } catch {
            return [item.lessonId, createDefaultProgress(item.lessonId)] as const
          }
        }),
      )

      if (cancelled) return

      setLessonProgressById(Object.fromEntries(progressEntries))
      setLoadingLessonProgressMap(false)
    }

    void loadLessonProgressMap()
    return () => { cancelled = true }
  }, [isStudentPreview, lessons, session])

  useEffect(() => {
    if (!course || loadingLessonProgressMap || !selectedLessonId) return

    const lockState = lessonLockMap.get(selectedLessonId)
    if (!lockState?.locked) return

    const prerequisiteLessonId = lockState.prerequisiteLessonId
    const nextLessonId = prerequisiteLessonId && !lessonLockMap.get(prerequisiteLessonId)?.locked
      ? prerequisiteLessonId
      : firstUnlockedLessonId ?? lessons[0]?.lessonId ?? null
    if (nextLessonId && nextLessonId !== selectedLessonId) {
      setSelectedLessonId(nextLessonId)
    }
    setNotice(
      lockState.prerequisiteLessonTitle
        ? `"${lockState.prerequisiteLessonTitle}" 강의를 끝까지 보면 열립니다.`
        : '이전 강의를 끝까지 보면 열립니다.',
      )
  }, [course, firstUnlockedLessonId, lessonLockMap, lessons, loadingLessonProgressMap, selectedLessonId])

  useEffect(() => {
    if (isStudentPreview || !sessionUserId) {
      setAssignmentHistoryByAssignmentId({})
      return
    }

    let cancelled = false
    const userId = sessionUserId

    async function loadAssignmentHistory() {
      try {
        const history = await requestWithTimeout(
          LESSON_LOAD_TIMEOUT_MS,
          (signal) => learnerAssignmentApi.getSubmissionHistory(userId, signal),
        )
        if (cancelled) return

        const nextHistoryByAssignmentId = history.submissions.reduce<Record<number, SubmissionHistoryItem>>((acc, item) => {
          const current = acc[item.assignmentId]
          const currentSubmittedAt = current?.submittedAt ?? ''
          const nextSubmittedAt = item.submittedAt ?? ''
          if (!current || nextSubmittedAt > currentSubmittedAt || item.submissionId > current.submissionId) {
            acc[item.assignmentId] = item
          }
          return acc
        }, {})

        setAssignmentHistoryByAssignmentId(nextHistoryByAssignmentId)
      } catch {
        if (!cancelled) setAssignmentHistoryByAssignmentId({})
      }
    }

    void loadAssignmentHistory()
    return () => { cancelled = true }
  }, [isStudentPreview, sessionUserId])

  useEffect(() => {
    if (isStudentPreview) {
      setQnaQuestions([])
      setQnaDetails({})
      setQnaError(null)
      setLoadingQna(false)
      return
    }

    if (!session?.accessToken || !course?.courseId) return
    let cancelled = false
    const courseId = course.courseId

    async function loadQna() {
      setLoadingQna(true)
      setQnaError(null)
      setQuestionForm(createQuestionFormState())

      const [questionsResult, templatesResult] = await Promise.allSettled([
        requestWithTimeout(QNA_LOAD_TIMEOUT_MS, (signal) => qnaApi.getQuestions(courseId, signal)),
        requestWithTimeout(QNA_LOAD_TIMEOUT_MS, (signal) => qnaApi.getTemplates(signal)),
      ])

      if (cancelled) return

      if (questionsResult.status === 'fulfilled') {
        setQnaQuestions(questionsResult.value)
        setQnaError(null)
      } else {
        setQnaQuestions([])
        setQnaError('Q&A 데이터를 불러오지 못했습니다.')
      }

      if (templatesResult.status === 'fulfilled') {
        setQnaTemplates(templatesResult.value)
        setQuestionForm((current) => ({
          ...current,
          templateType: current.templateType || templatesResult.value[0]?.templateType || '',
        }))
      } else {
        setQnaTemplates([])
      }

      setLoadingQna(false)
    }

    void loadQna()
    return () => { cancelled = true }
  }, [course?.courseId, isStudentPreview, session?.accessToken, sessionUserId])

  useEffect(() => {
    if (isStudentPreview || !course?.courseId || !session?.accessToken) return

    let closed = false
    let reconnectTimeoutId = 0
    let socket: WebSocket | null = null
    const courseId = course.courseId
    const accessToken = session.accessToken

    const connect = () => {
      if (closed) return

      try {
        socket = new WebSocket(buildQnaRealtimeWebSocketUrl(courseId, accessToken))
      } catch {
        reconnectTimeoutId = window.setTimeout(connect, 3000)
        return
      }

      socket.onmessage = (message) => {
        let event: QnaRealtimeEvent

        try {
          event = JSON.parse(message.data) as QnaRealtimeEvent
        } catch {
          return
        }

        if (event.courseId !== courseId || typeof event.questionId !== 'number') {
          return
        }

        setQnaQuestions((current) => current.map((item) => {
          if (item.id !== event.questionId) return item
          return {
            ...item,
            qnaStatus: 'ANSWERED',
            answerCount: Math.max(item.answerCount, 1),
          }
        }))

        if (openQuestionIdRef.current === event.questionId || qnaDetailsRef.current[event.questionId]) {
          void refreshQnaQuestion(event.questionId)
        }
      }

      socket.onclose = () => {
        if (!closed) {
          reconnectTimeoutId = window.setTimeout(connect, 3000)
        }
      }

      socket.onerror = () => {
        socket?.close()
      }
    }

    connect()

    return () => {
      closed = true
      window.clearTimeout(reconnectTimeoutId)
      socket?.close()
    }
  }, [course?.courseId, isStudentPreview, refreshQnaQuestion, session?.accessToken])

  useEffect(() => {
    if (!lesson || selectedLessonLocked || !isAssignmentLesson(lesson)) {
      setAssignmentModalLessonId(null)
      setAssignmentLoadingVisible(false)
      setAssignmentGradingResult(null)
      return
    }

    const assignment = resolveLessonAssignment(lesson)
    setAssignmentModalLessonId(lesson.lessonId)
    setAssignmentForm(createAssignmentFormState(assignment))
    setAssignmentMessage(null)
    setAssignmentLoadingVisible(false)
    setAssignmentGradingResult(null)
  }, [lesson, selectedLessonLocked])

  useEffect(() => {
    if (!assignmentLoadingVisible) {
      setAssignmentLoadingText(ASSIGNMENT_LOADING_MESSAGES[0])
      return
    }

    setAssignmentLoadingText(ASSIGNMENT_LOADING_MESSAGES[0])
    const timeoutIds = ASSIGNMENT_LOADING_MESSAGES.slice(1).map((message, index) => window.setTimeout(
      () => setAssignmentLoadingText(message),
      800 + (index * 1000),
    ))
    return () => timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
  }, [assignmentLoadingVisible])

  useEffect(() => {
    if (!lesson) {
      setProgress(null)
      setPlayerConfig(null)
      setNotes([])
      setDuration(0)
      setCurrentTime(0)
      setIsPipActive(false)
      return
    }
    if (selectedLessonLocked) {
      setProgress(createDefaultProgress(lesson.lessonId))
      setPlayerConfig(createDefaultPlayerConfig(lesson.lessonId))
      setNotes([])
      setDuration(lesson.durationSeconds ?? 0)
      setCurrentTime(0)
      setIsPlaying(false)
      setIsPipActive(false)
      setLoadingLesson(false)
      return
    }
    let cancelled = false

    async function loadLessonState() {
      setLoadingLesson(true)
      setNotice(null)
      setVideoFailed(false)
      setNoteContent('')
      setNoteMessage(null)
      completedPersistedLessonIdRef.current = null

      const storedProgress = readJsonStorage(getProgressStorageKey(lesson.lessonId), createDefaultProgress(lesson.lessonId))
      const storedNotes = readJsonStorage(getNotesStorageKey(lesson.lessonId), [] as TimestampNote[])

      const lessonDuration = lesson.durationSeconds ?? 0
      const storedFullyWatched = lessonDuration > 0 && storedProgress.progressSeconds >= lessonDuration
      const initialProgressSeconds = resolveInitialPlaybackSeconds(
        lesson.lessonId,
        shouldResumePlayback && !storedFullyWatched ? storedProgress.progressSeconds : 0,
      )
      resumeTimeRef.current = initialProgressSeconds
      lastRenderedSecondRef.current = initialProgressSeconds
      setProgress(storedProgress)
      setPlayerConfig(createDefaultPlayerConfig(lesson.lessonId))
      setNotes(storedNotes)
      setCurrentTime(initialProgressSeconds)
      setDuration(lesson.durationSeconds ?? 0)

      if (isStudentPreview) {
        const previewProgress: LearningLessonProgress = {
          ...createDefaultProgress(lesson.lessonId),
          progressPercent: lesson.durationSeconds && lesson.durationSeconds > 0
            ? Math.max(0, Math.min(100, Math.round((initialProgressSeconds / lesson.durationSeconds) * 100)))
            : 0,
          progressSeconds: initialProgressSeconds,
        }
        setProgress(previewProgress)
        setLessonProgressById((current) => ({
          ...current,
          [lesson.lessonId]: previewProgress,
        }))
        setLoadingLesson(false)
        return
      }

      try {
        const [sessionProgress, config, fetchedNotes] = await Promise.all([
          requestWithTimeout(LESSON_LOAD_TIMEOUT_MS, (signal) => lessonSessionApi.startSession(lesson.lessonId, signal)),
          requestWithTimeout(LESSON_LOAD_TIMEOUT_MS, (signal) => learningPlayerApi.getPlayerConfig(lesson.lessonId, signal)).catch(() => null),
          requestWithTimeout(LESSON_LOAD_TIMEOUT_MS, (signal) => lessonNoteApi.getNotes(lesson.lessonId, signal)).catch(() => null),
        ])

        if (cancelled) return

        const nextProgress = {
          ...sessionProgress,
          defaultPlaybackRate: config?.defaultPlaybackRate ?? sessionProgress.defaultPlaybackRate ?? 1,
          pipEnabled: config?.pipEnabled ?? sessionProgress.pipEnabled ?? false,
        }

        const sessionFullyWatched = lessonDuration > 0 && nextProgress.progressSeconds >= lessonDuration
        const nextResumeSeconds = resolveInitialPlaybackSeconds(
          lesson.lessonId,
          shouldResumePlayback && !sessionFullyWatched ? nextProgress.progressSeconds : 0,
        )
        resumeTimeRef.current = nextResumeSeconds
        lastRenderedSecondRef.current = nextResumeSeconds
        setProgress(nextProgress)
        setLessonProgressById((current) => ({
          ...current,
          [lesson.lessonId]: mergeLessonProgress(lesson.lessonId, nextProgress, current[lesson.lessonId]),
        }))
        setPlayerConfig({
          lessonId: lesson.lessonId,
          defaultPlaybackRate: nextProgress.defaultPlaybackRate,
          pipEnabled: nextProgress.pipEnabled,
        })
        setCurrentTime(nextResumeSeconds)
        writeJsonStorage(getProgressStorageKey(lesson.lessonId), nextProgress)

        if (fetchedNotes) {
          setNotes(fetchedNotes)
          writeJsonStorage(getNotesStorageKey(lesson.lessonId), fetchedNotes)
        }
      } catch (error) {
        if (!cancelled && isAbortError(error)) setNotice('강의 상태 불러오기가 오래 걸립니다. 캐시된 값을 표시합니다.')
      } finally {
        if (!cancelled) setLoadingLesson(false)
      }
    }

    void loadLessonState()
    return () => { cancelled = true }
  }, [isStudentPreview, lesson, mergeLessonProgress, resolveInitialPlaybackSeconds, selectedLessonLocked, shouldResumePlayback])

  useEffect(() => {
    const video = videoRef.current
    if (!lesson) return
    if (!video || !resolvedVideoUrl) {
      setDuration(lesson.durationSeconds ?? 0)
      setIsPlaying(false)
      return
    }
    video.playbackRate = playerConfig?.defaultPlaybackRate ?? 1

    const handleLoadedMetadata = () => {
      const total = getPlaybackLimit(video)
      setDuration(total)
      if (total > 0) {
        setActualDurationByLessonId((current) => (
          current[lesson.lessonId] === Math.round(total)
            ? current
            : { ...current, [lesson.lessonId]: Math.round(total) }
        ))
      }
      if ((pendingVideoLoadRef.current || shouldResumePlayback || isStudentPreview) && resumeTimeRef.current > 0 && video.currentTime < 0.5) {
        video.currentTime = Math.min(resumeTimeRef.current, total || resumeTimeRef.current)
      }
    }
    const handleLoadedData = () => {
      setVideoFailed(false)
      if (pendingVideoLoadRef.current) setNotice(null)
      pendingVideoLoadRef.current = false
    }
    const handleCanPlay = () => {
      setVideoFailed(false)
      if (pendingVideoLoadRef.current) setNotice(null)
      pendingVideoLoadRef.current = false

      if (resumePlaybackAfterQualitySwitchRef.current) {
        resumePlaybackAfterQualitySwitchRef.current = false
        void video.play().catch((error) => {
          if (!isPlaybackBlockedError(error) && !isAbortError(error)) {
            setNotice(getVideoErrorMessage(video, resolvedVideoUrl))
          }
        })
        return
      }

      if (!shouldAutoplayPreview || previewAutoplayLessonIdRef.current === lesson.lessonId) {
        return
      }

      previewAutoplayLessonIdRef.current = lesson.lessonId
      void video.play().catch(async (error) => {
        if (!isPlaybackBlockedError(error)) {
          return
        }

        try {
          video.muted = true
          setIsMuted(true)
          await video.play()
          setNotice('브라우저 정책 때문에 음소거 상태로 먼저 재생했습니다. 필요하면 음소거를 해제해 주세요.')
        } catch {
          setNotice('브라우저 자동재생 정책 때문에 재생 버튼을 눌러야 합니다.')
        }
      })
    }
    const handleTimeUpdate = () => {
      const total = getPlaybackLimit(video)
      if (total > 0 && video.currentTime >= total) {
        if (!video.paused) video.pause()
        // 끝에 도달하면 dot이 정확히 끝까지 가도록 total 그대로 사용
        if (total !== lastRenderedSecondRef.current) {
          lastRenderedSecondRef.current = total
          setCurrentTime(total)
        }
        persistCompletedLesson(lesson.lessonId, total)
        return
      }
      const nextSecond = total > 0 ? Math.min(Math.floor(video.currentTime), total) : Math.floor(video.currentTime)
      if (nextSecond === lastRenderedSecondRef.current) return
      lastRenderedSecondRef.current = nextSecond
      setCurrentTime(nextSecond)
    }
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      const total = getPlaybackLimit(video)
      if (total > 0) {
        lastRenderedSecondRef.current = total
        setCurrentTime(total)
        persistCompletedLesson(lesson.lessonId, total)
      }
    }
    const handleEnterPip = () => setIsPipActive(true)
    const handleLeavePip = () => setIsPipActive(false)
    const handleError = () => {
      setVideoFailed(true)
      setIsPlaying(false)
      setNotice(getVideoErrorMessage(video, resolvedVideoUrl))
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('error', handleError)
    video.addEventListener('enterpictureinpicture', handleEnterPip)
    video.addEventListener('leavepictureinpicture', handleLeavePip)
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('error', handleError)
      video.removeEventListener('enterpictureinpicture', handleEnterPip)
      video.removeEventListener('leavepictureinpicture', handleLeavePip)
    }
  }, [getPlaybackLimit, isStudentPreview, lesson, persistCompletedLesson, playerConfig?.defaultPlaybackRate, resolvedVideoUrl, shouldAutoplayPreview, shouldResumePlayback])

  const persistProgress = useEffectEvent(async (lessonId: number) => {
    if (isStudentPreview) return
    if (!lesson || lesson.lessonId !== lessonId) return
    const video = videoRef.current
    const total = getPlaybackLimit(video)
    const currentSeconds = video ? Math.floor(video.currentTime) : Math.floor(currentTime)
    const progressSeconds = total > 0 ? Math.min(currentSeconds, total) : currentSeconds
    const progressPercent = total > 0 ? Math.max(0, Math.min(100, Math.round((progressSeconds / total) * 100))) : 0

    const nextProgress: LearningLessonProgress = {
      lessonId,
      progressPercent,
      progressSeconds,
      defaultPlaybackRate: playerConfig?.defaultPlaybackRate ?? 1,
      pipEnabled: playerConfig?.pipEnabled ?? false,
      isCompleted: progressPercent >= 100,
      lastWatchedAt: new Date().toISOString(),
    }
    const mergedProgress = mergeLessonProgress(lessonId, nextProgress, lessonProgressById[lessonId] ?? progress)
    setProgress(mergedProgress)
    setLessonProgressById((current) => ({
      ...current,
      [lessonId]: mergeLessonProgress(lessonId, mergedProgress, current[lessonId]),
    }))
    writeJsonStorage(getProgressStorageKey(lessonId), mergedProgress)
    try {
      const savedProgress = await lessonSessionApi.saveProgress(lessonId, { progressPercent, progressSeconds })
      const mergedSavedProgress = mergeLessonProgress(lessonId, savedProgress, mergedProgress)
      setProgress((current) => (current?.lessonId === lessonId ? mergedSavedProgress : current))
      setLessonProgressById((current) => ({
        ...current,
        [lessonId]: mergeLessonProgress(lessonId, mergedSavedProgress, current[lessonId]),
      }))
      writeJsonStorage(getProgressStorageKey(lessonId), mergedSavedProgress)
    } catch {
      // 요청 실패 시 캐시된 값 유지
    }
  })

  useEffect(() => {
    if (isStudentPreview) return
    if (!lesson) return
    const lessonId = lesson.lessonId
    const intervalId = window.setInterval(() => void persistProgress(lessonId), 15000)
    const handlePageHide = () => void persistProgress(lessonId)
    window.addEventListener('pagehide', handlePageHide)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('pagehide', handlePageHide)
      void persistProgress(lessonId)
    }
  }, [isStudentPreview, lesson])

  useEffect(() => {
    if (!noteMessage && !notice && !questionMessage) return
    const timeoutId = window.setTimeout(() => {
      setNoteMessage(null)
      setNotice(null)
      setQuestionMessage(null)
    }, 2600)
    return () => window.clearTimeout(timeoutId)
  }, [noteMessage, notice, questionMessage])

  // OCR 워커 미리 초기화 (첫 클릭 지연 최소화)
  useEffect(() => { warmupOcrWorker() }, [])

  const handleKeyboardTogglePlay = useEffectEvent(() => {
    void handleTogglePlaySafe()
  })

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFrameFullscreen(document.fullscreenElement === frameRef.current)
    }

    syncFullscreenState()
    document.addEventListener('fullscreenchange', syncFullscreenState)
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState)
  }, [])

  // ESC 키로 구간 선택 모드 취소
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSelectMode(false)
        setSelectDrag(null)
        return
      }

      if (e.code !== 'Space' && e.key !== ' ') return
      if (!resolvedVideoUrl || selectedLessonIsQuiz || quizModalLessonId || assignmentModalLessonId || completionVisible) return
      if (isNativeKeyboardControlTarget(e.target)) return

      e.preventDefault()
      handleKeyboardTogglePlay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    assignmentModalLessonId,
    completionVisible,
    quizModalLessonId,
    resolvedVideoUrl,
    selectedLessonIsQuiz,
  ])

  async function handleTogglePlaySafe() {
    const video = videoRef.current
    if (!video || !resolvedVideoUrl) return

    if (videoFailed) {
      pendingVideoLoadRef.current = true
      setVideoFailed(false)
      setNotice('영상 재생 준비 중입니다.')
      video.load()
      return
    }

    if (videoFailed) {
      setVideoFailed(false)
      setNotice('영상을 다시 불러오는 중입니다.')
      video.load()
    }

    if (video.paused) {
      const playbackLimit = getPlaybackLimit(video)
      if (playbackLimit > 0 && video.currentTime >= playbackLimit) {
        video.currentTime = 0
        lastRenderedSecondRef.current = 0
        setCurrentTime(0)
      }

      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        pendingVideoLoadRef.current = true
        setNotice('영상 재생 준비 중입니다.')
        if (video.networkState === HTMLMediaElement.NETWORK_EMPTY) video.load()
        return
      }

      try {
        await video.play()
        setNotice(null)
      } catch (error) {
        if (isPlaybackBlockedError(error)) {
          try {
            video.muted = true
            setIsMuted(true)
            await video.play()
            setNotice('브라우저 정책 때문에 음소거 상태로 먼저 재생했습니다. 필요하면 음소거를 해제해 주세요.')
            return
          } catch (mutedError) {
            if (!isPlaybackBlockedError(mutedError) && !isAbortError(mutedError)) {
              setNotice(getVideoErrorMessage(video, resolvedVideoUrl))
              return
            }
          }

          setNotice('브라우저 자동 재생 정책 때문에 재생이 막혔습니다. 재생 버튼을 다시 눌러 주세요.')
          return
        }

        if (isAbortError(error)) {
          setNotice('영상을 아직 불러오는 중입니다. 잠시 후 다시 시도해 주세요.')
          return
        }

        setNotice(getVideoErrorMessage(video, resolvedVideoUrl))
      }
      return
    }

    video.pause()
  }

  function handleRetryVideoLoad() {
    const video = videoRef.current
    if (!video || !resolvedVideoUrl) return
    pendingVideoLoadRef.current = true
    setVideoFailed(false)
    setIsPlaying(false)
    setNotice('영상을 다시 불러오는 중입니다.')
    video.load()
  }

  async function handleOcr(region?: ScreenRegion) {
    const video = videoRef.current
    if (!video || ocrBusy) return
    setOcrBusy(true)
    setIsSelectMode(false)
    setSelectDrag(null)
    setNotice(region ? '선택한 영역의 글자를 읽는 중...' : '화면의 글자를 읽는 중...')
    try {
      const { text, source } = await captureAndOcr(video, region, (msg) => setNotice(msg))
      if (!text.trim()) {
        setNotice(`${formatOcrSourceLabel(source)} · 인식한 글자가 없습니다.`)
        return
      }
      await navigator.clipboard.writeText(text)
      setNotice('클립보드에 복사가 완료되었습니다.')
    } catch (err) {
      setNotice(`글자를 읽지 못했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`)
    } finally {
      setOcrBusy(false)
    }
  }

  function handleToggleMute() {
    const video = videoRef.current
    if (!video) return
    const next = !video.muted
    video.muted = next
    setIsMuted(next)
  }

  function handleVolumeChange(next: number) {
    const video = videoRef.current
    if (!video) return
    video.volume = next
    video.muted = next === 0
    setVolume(next)
    setIsMuted(next === 0)
  }

  function handleSeek(nextSeconds: number) {
    const video = videoRef.current
    if (!video) return
    const upperBound = getPlaybackLimit(video) || (lesson?.durationSeconds ?? 0) || nextSeconds
    const bounded = Math.max(0, Math.min(upperBound, nextSeconds))
    video.currentTime = bounded
    lastRenderedSecondRef.current = Math.floor(bounded)
    setCurrentTime(Math.floor(bounded))
  }

  function markLessonCompletedForNavigation(item: LearningLesson, options?: PersistCompletionOptions) {
    const totalSeconds = Math.max(1, duration || item.durationSeconds || 1)
    persistCompletedLesson(item.lessonId, totalSeconds, options)
  }

  function openAssignmentModal(item: LearningLesson) {
    if (!isAssignmentLesson(item)) return
    setAssignmentModalLessonId(item.lessonId)
    setAssignmentForm(createAssignmentFormState(resolveLessonAssignment(item)))
    setAssignmentFileDragActive(false)
    setAssignmentMessage(null)
    setAssignmentLoadingVisible(false)
    setAssignmentGradingResult(null)
  }

  function closeAssignmentModal() {
    setAssignmentModalLessonId(null)
    setAssignmentForm(createAssignmentFormState())
    setAssignmentFileDragActive(false)
    setAssignmentMessage(null)
    setAssignmentLoadingVisible(false)
  }

  function closeAssignmentGradingResult() {
    setAssignmentGradingResult(null)
  }

  function openCompletionOverlay() {
    if (!course || !assignmentGradingResult) {
      closeAssignmentGradingResult()
      return
    }

    openCourseCompletionOverlay(assignmentResultProgressById, assignmentGradingResult)
    closeAssignmentGradingResult()
  }

  function closeCompletionOverlay() {
    setCompletionVisible(false)
    setCompletionCardFlipped(false)
  }

  function handleAssignmentResultPrimaryAction() {
    if (assignmentResultCompletesCourse) {
      openCompletionOverlay()
      return
    }

    if (!assignmentResultNextLesson || selectedLessonLocked) {
      closeAssignmentGradingResult()
      return
    }

    closeAssignmentGradingResult()
    setSelectedLessonId(assignmentResultNextLesson.lessonId)
    setNotice(`"${assignmentResultNextLesson.title}" 강의로 이동했습니다.`)
  }

  function openQuizModal(item: LearningLesson) {
    setQuizModalLessonId(item.lessonId)
    setQuizQuestionIndex(0)
    setQuizSelectedOptionIndex(null)
    setQuizFeedback(null)
  }

  function closeQuizModal() {
    setQuizModalLessonId(null)
    setQuizQuestionIndex(0)
    setQuizSelectedOptionIndex(null)
    setQuizFeedback(null)
  }

  function handleSelectLesson(lessonId: number) {
    const lockState = lessonLockMap.get(lessonId)
    if (lockState?.locked) {
      setNotice(
        lockState.prerequisiteLessonTitle
          ? `"${lockState.prerequisiteLessonTitle}" 강의를 끝까지 보면 열립니다.`
          : '이전 강의를 끝까지 보면 열립니다.',
      )
      return
    }

    const targetLesson = lessons.find((item) => item.lessonId === lessonId) ?? null
    setSelectedLessonId(lessonId)
    if (!targetLesson || targetLesson.lessonId !== quizModalLessonId) {
      closeQuizModal()
    }
    if (!targetLesson || targetLesson.lessonId !== assignmentModalLessonId) {
      closeAssignmentModal()
    }
    setAssignmentLoadingVisible(false)
    setAssignmentGradingResult(null)
  }

  function handlePreviousLesson() {
    if (!previousLesson) return
    setSelectedLessonId(previousLesson.lessonId)
    closeQuizModal()
    closeAssignmentModal()
    closeAssignmentGradingResult()
    setAssignmentLoadingVisible(false)
  }

  function handleNextLesson() {
    if (!lesson || !nextLesson || selectedLessonLocked) return
    markLessonCompletedForNavigation(lesson)
    setSelectedLessonId(nextLesson.lessonId)
    setNotice(`"${nextLesson.title}" 강의를 열었습니다.`)
    closeQuizModal()
    closeAssignmentModal()
    closeAssignmentGradingResult()
    setAssignmentLoadingVisible(false)
  }

  function handleQuizOptionSelect(optionIndex: number) {
    setQuizSelectedOptionIndex(optionIndex)
    setQuizFeedback(null)
  }

  function handleQuizCheckAnswer() {
    if (!activeQuizQuestion) return
    if (quizSelectedOptionIndex === null) {
      setNotice('답안을 선택해 주세요.')
      return
    }
    setQuizFeedback(quizSelectedOptionIndex === activeQuizQuestion.correctOptionIndex ? 'correct' : 'wrong')
  }

  function handleQuizNextQuestion() {
    if (!quizModalLesson || !activeQuizQuestion || quizFeedback !== 'correct') {
      handleQuizCheckAnswer()
      return
    }

    if (quizQuestionIndex < quizModalQuestions.length - 1) {
      setQuizQuestionIndex((current) => current + 1)
      setQuizSelectedOptionIndex(null)
      setQuizFeedback(null)
      return
    }

    const currentQuizLessonIndex = lessons.findIndex((item) => item.lessonId === quizModalLesson.lessonId)
    const nextSectionFirstLesson = currentQuizLessonIndex >= 0
      ? lessons.slice(currentQuizLessonIndex + 1).find((item) => item.sectionId !== quizModalLesson.sectionId) ?? null
      : null

    quizScoreByLessonIdRef.current = {
      ...quizScoreByLessonIdRef.current,
      [quizModalLesson.lessonId]: 100,
    }
    markLessonCompletedForNavigation(quizModalLesson)
    if (nextSectionFirstLesson) {
      setSelectedLessonId(nextSectionFirstLesson.lessonId)
      closeQuizModal()
      setNotice(`"${nextSectionFirstLesson.sectionTitle}" 섹션의 첫 강의로 이동했습니다.`)
      return
    }

    closeQuizModal()
    setNotice('퀴즈를 완료했습니다. 마지막 섹션입니다.')
  }

  function handleAssignmentFilesSelected(fileList: FileList | null) {
    const nextFiles = Array.from(fileList ?? [])
    setAssignmentForm((current) => {
      const mergedFiles = [...current.files]
      nextFiles.forEach((file) => {
        const existingIndex = mergedFiles.findIndex((item) => item.name === file.name && item.size === file.size)
        if (existingIndex >= 0) mergedFiles[existingIndex] = file
        else mergedFiles.push(file)
      })
      return { ...current, files: mergedFiles }
    })
    setAssignmentMessage(null)
  }

  function handleAssignmentFileDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'copy'
    setAssignmentFileDragActive(true)
  }

  function handleAssignmentFileDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.stopPropagation()
    setAssignmentFileDragActive(false)
  }

  function handleAssignmentFileDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.stopPropagation()
    setAssignmentFileDragActive(false)
    handleAssignmentFilesSelected(event.dataTransfer.files)
  }

  function handleAssignmentFileRemove(fileName: string) {
    setAssignmentForm((current) => ({
      ...current,
      files: current.files.filter((file) => file.name !== fileName),
    }))
    setAssignmentMessage(null)
  }

  async function handleAssignmentSubmit() {
    if (isStudentPreview) {
      setAssignmentMessage('미리보기에서는 과제를 제출할 수 없습니다.')
      return
    }

    if (!sessionUserId) {
      setAssignmentMessage('로그인이 필요합니다.')
      return
    }
    if (!assignmentModal || !assignmentModalLesson) return
    if (assignmentModal.assignmentId <= 0) {
      setAssignmentMessage('이 강의에는 아직 연결된 과제 제출 스키마가 없습니다.')
      return
    }

    if (!isAssignmentSubmissionFormReady(assignmentModal, assignmentForm)) {
      setAssignmentMessage(resolveAssignmentSubmissionEmptyMessage(assignmentModal))
      return
    }

    const payload = await buildAssignmentSubmissionPayload(assignmentModal, assignmentForm)

    setAssignmentSubmitBusy(true)
    setAssignmentMessage('과제를 제출하는 중입니다.')

    try {
      const precheck = await learnerAssignmentApi.precheck(assignmentModal.assignmentId, sessionUserId, payload)
      if (!precheck.passed) {
        const failedLabels = [
          precheck.readmePassed ? null : 'README',
          precheck.testPassed ? null : '테스트',
          precheck.lintPassed ? null : '린트',
          precheck.fileFormatPassed ? null : '파일 형식',
        ].filter((item): item is string => Boolean(item))
        setAssignmentMessage(
          failedLabels.length
            ? `제출 조건을 충족하지 않았습니다. ${failedLabels.join(', ')}`
            : (precheck.message ?? '제출 파일을 다시 확인해 주세요.'),
        )
        return
      }

      setAssignmentLoadingVisible(true)
      const submission = await learnerAssignmentApi.submit(assignmentModal.assignmentId, sessionUserId, payload)
      setAssignmentHistoryByAssignmentId((current) => ({
        ...current,
        [submission.assignmentId]: {
          submissionId: submission.submissionId,
          assignmentId: submission.assignmentId,
          assignmentTitle: assignmentModal.title,
          submissionStatus: submission.submissionStatus,
          qualityScore: submission.qualityScore,
          totalScore: submission.totalScore,
          isLate: submission.isLate,
          submittedAt: submission.submittedAt,
        },
      }))
      setAssignmentMessage('과제가 제출되었습니다.')
      setAssignmentGradingResult({
        lessonId: assignmentModalLesson.lessonId,
        lessonTitle: assignmentModalLesson.title,
        assignment: assignmentModal,
        precheck,
        submission,
      })
      markLessonCompletedForNavigation(assignmentModalLesson, { showCourseCompletion: false })
      closeAssignmentModal()
    } catch (error) {
      setAssignmentMessage(error instanceof Error ? error.message : '과제 제출에 실패했습니다.')
    } finally {
      setAssignmentSubmitBusy(false)
      setAssignmentLoadingVisible(false)
    }
  }

  async function handleTogglePip() {
    const pipDocument = document as PipDocument
    const video = videoRef.current as PipVideoElement | null
    if (!video) return

    // 브라우저 PIP 미지원
    if (!pipDocument.pictureInPictureEnabled || !video.requestPictureInPicture) {
      setNotice('이 브라우저는 PIP 모드를 지원하지 않습니다.')
      return
    }

    try {
      if (pipDocument.pictureInPictureElement) {
        // 현재 PIP 활성 → 종료
        if (pipDocument.exitPictureInPicture) await pipDocument.exitPictureInPicture()
      } else {
        // 영상 메타데이터 로드 확인 (readyState 0=HAVE_NOTHING)
        if (video.readyState < 1) {
          setNotice('영상이 아직 로드되지 않았습니다. 잠시 후 다시 시도해 주세요.')
          return
        }
        await video.requestPictureInPicture()
      }
      // 상태는 enterpictureinpicture / leavepictureinpicture 이벤트로 자동 반영
      // 백엔드에 선호 설정 저장
      if (lesson) {
        learningPlayerApi.updatePipMode(lesson.lessonId, !isPipActive).catch(() => {})
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setNotice('영상을 먼저 재생한 뒤 PIP 모드를 사용해 주세요.')
      } else {
        setNotice('PIP 모드 전환에 실패했습니다.')
      }
    }
  }

  async function handleToggleFullscreen() {
    const frame = frameRef.current
    if (!frame) return

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        return
      }

      await frame.requestFullscreen()
    } catch {
      setNotice('전체 화면 전환에 실패했습니다.')
    }
  }

  async function handleCyclePlaybackRate() {
    if (!lesson || !playerConfig) return
    const currentIndex = PLAYER_SPEEDS.indexOf(playerConfig.defaultPlaybackRate as (typeof PLAYER_SPEEDS)[number])
    const nextRate = PLAYER_SPEEDS[(currentIndex + 1 + PLAYER_SPEEDS.length) % PLAYER_SPEEDS.length]
    setPlayerConfig({ ...playerConfig, defaultPlaybackRate: nextRate })
    if (videoRef.current) videoRef.current.playbackRate = nextRate
    try {
      await learningPlayerApi.updatePlaybackRate(lesson.lessonId, nextRate)
    } catch {
      // 로컬 설정 유지
    }
  }

  async function handleSetPlaybackRate(nextRate: number) {
    if (!lesson || !playerConfig) return
    setPlayerConfig({ ...playerConfig, defaultPlaybackRate: nextRate })
    setSettingsOpen(false)
    if (videoRef.current) videoRef.current.playbackRate = nextRate
    try {
      await learningPlayerApi.updatePlaybackRate(lesson.lessonId, nextRate)
    } catch {
      // Keep the local setting if persistence fails.
    }
  }

  function handleSetVideoQuality(nextQuality: LearningVideoQuality) {
    const nextSource = videoQualitySources[nextQuality]
    if (!nextSource) {
      setNotice(`${nextQuality}p 영상 소스가 이 강의에 등록되어 있지 않습니다.`)
      return
    }

    if (activeVideoQuality === nextQuality) {
      setSettingsOpen(false)
      return
    }

    const video = videoRef.current
    if (video) {
      const restoreSecond = Math.max(0, Math.floor(video.currentTime || currentTime))
      resumeTimeRef.current = restoreSecond
      lastRenderedSecondRef.current = restoreSecond
      resumePlaybackAfterQualitySwitchRef.current = !video.paused
      pendingVideoLoadRef.current = true
      setVideoFailed(false)
      setNotice(`${nextQuality}p로 전환 중입니다.`)
    }

    setSelectedVideoQuality(nextQuality)
    setSettingsOpen(false)
  }

  async function handleToggleQuestion(questionId: number) {
    setOpenQuestionId((current) => (current === questionId ? null : questionId))
    if (qnaDetails[questionId] || loadingQuestionId === questionId) return
    setLoadingQuestionId(questionId)
    try {
      const detail = await qnaApi.getQuestionDetail(questionId)
      setQnaDetails((current) => ({ ...current, [questionId]: detail }))
      setQnaQuestions((current) => current.map((item) => (item.id === questionId ? toQuestionSummary(detail) : item)))
    } catch {
      setQnaError('질문 상세 정보를 불러오지 못했습니다.')
    } finally {
      setLoadingQuestionId((current) => (current === questionId ? null : current))
    }
  }

  async function handleSaveNote() {
    if (!lesson || !noteContent.trim()) return
    try {
      const created = await lessonNoteApi.createNote(lesson.lessonId, {
        timestampSecond: Math.floor(currentTime),
        content: noteContent.trim(),
      })
      const nextNotes = [...notes, created].sort((a, b) => a.timestampSecond - b.timestampSecond)
      setNotes(nextNotes)
      writeJsonStorage(getNotesStorageKey(lesson.lessonId), nextNotes)
      setNoteContent('')
      setNoteComposerOpen(false)
      setNoteMessage('노트가 저장되었습니다.')
    } catch {
      setNoteMessage('노트 저장에 실패했습니다.')
    }
  }

  async function handleDeleteNote(note: TimestampNote) {
    if (!lesson) return
    try {
      await lessonNoteApi.deleteNote(lesson.lessonId, note.noteId)
      const nextNotes = notes.filter((item) => item.noteId !== note.noteId)
      setNotes(nextNotes)
      writeJsonStorage(getNotesStorageKey(lesson.lessonId), nextNotes)
      setNoteMessage('노트가 삭제되었습니다.')
    } catch {
      setNoteMessage('노트 삭제에 실패했습니다.')
    }
  }

  async function handleUpdateNote() {
    if (!lesson || !openNoteId || !editingNoteContent.trim()) return
    const targetNote = notes.find((item) => item.noteId === openNoteId)
    if (!targetNote) return
    try {
      const updated = await lessonNoteApi.updateNote(lesson.lessonId, openNoteId, {
        timestampSecond: targetNote.timestampSecond,
        content: editingNoteContent.trim(),
      })
      const nextNotes = notes.map((item) => (item.noteId === updated.noteId ? updated : item))
      setNotes(nextNotes)
      writeJsonStorage(getNotesStorageKey(lesson.lessonId), nextNotes)
      setOpenNoteId(null)
      setEditingNoteContent('')
      setNoteMessage('노트가 수정되었습니다.')
    } catch {
      setNoteMessage('노트 수정에 실패했습니다.')
    }
  }

  async function handleSubmitQuestion() {
    if (isStudentPreview) {
      setQuestionMessage('미리보기에서는 질문을 등록할 수 없습니다.')
      return
    }

    if (!course) {
      setQuestionMessage('강의 정보를 불러온 뒤 다시 시도해 주세요.')
      return
    }
    if (!sessionUserId) {
      setQuestionMessage('로그인이 필요합니다.')
      return
    }
    if (!questionForm.templateType) {
      setQuestionMessage('질문 템플릿을 불러온 뒤 다시 시도해 주세요.')
      return
    }
    const content = questionForm.content.trim()
    if (!content) {
      setQuestionMessage('질문 내용을 입력해 주세요.')
      return
    }
    const title = questionForm.title.trim()
      || content.split('\n')[0].trim().slice(0, 48)
      || `질문 ${formatTime(currentTime)}`

    const payload: CreateQnaQuestionRequest = {
      templateType: questionForm.templateType,
      difficulty: questionForm.difficulty,
      title,
      content,
      courseId: course.courseId,
      lessonId: lesson?.lessonId ?? null,
      lectureTimestamp: questionForm.attachTimestamp ? formatTime(currentTime) : null,
    }

    setQuestionBusy(true)
    try {
      const created = await qnaApi.createQuestion(payload, sessionUserId)
      setQnaDetails((current) => ({ ...current, [created.id]: created }))
      setQnaQuestions((current) => [toQuestionSummary(created), ...current.filter((item) => item.id !== created.id)])
      setQuestionForm((current) => ({ ...current, title: '', content: '' }))
      setQuestionMessage('질문이 등록되었습니다.')
      startTransition(() => {
        setActiveTab('qna')
        setOpenQuestionId(created.id)
      })
      setQuestionComposerOpen(false)
    } catch (error) {
      setQuestionMessage(error instanceof Error ? error.message : '질문 등록에 실패했습니다.')
    } finally {
      setQuestionBusy(false)
    }
  }

  if (!session) return { status: 'login' as const }

  if (!loadingCourse && courseError) {
    return {
      status: 'error' as const,
      title: '학습 페이지를 열 수 없습니다',
      message: courseError,
      actionHref: courseDetailHref,
      actionLabel: initialCourseId ? '강의 상세로 돌아가기' : '강의 목록으로',
    }
  }

  if (!course || !lesson) return { status: 'loading' as const }

// ─── Derived render values ────────────────────────────────────────
  const hasVideoSource = Boolean(resolvedVideoUrl) && !selectedLessonIsQuiz
  const showVideoErrorOverlay = hasVideoSource && videoFailed
  const activeQuestionSummary = openQuestionId
    ? qnaQuestions.find((item) => item.id === openQuestionId) ?? null
    : null
  const activeQuestionDetail = openQuestionId ? qnaDetails[openQuestionId] ?? null : null
  const sortedNotes = [...notes].sort((left, right) => right.timestampSecond - left.timestampSecond)
  const notePanelIsEmpty = !sortedNotes.length && !noteComposerOpen
  const activeNote = openNoteId ? notes.find((item) => item.noteId === openNoteId) ?? null : null
  const playbackMax = Math.max(duration, 1)
  const playbackProgressPercent = Math.min(100, Math.max(0, (currentTime / playbackMax) * 100))

  return {
    status: 'ready' as const,
    isStudentPreview,
    studentPreviewReturnHref,
    learningBackHref,
    lesson,
    courseProgressPercent,
    frameRef,
    setIsSelectMode,
    setSelectDrag,
    ocrBusy,
    isSelectMode,
    hasVideoSource,
    activeVideoQuality,
    videoRef,
    resolvedVideoUrl,
    course,
    setVideoFailed,
    handleTogglePlaySafe,
    showVideoErrorOverlay,
    handleRetryVideoLoad,
    selectDrag,
    handleOcr,
    isPlaying,
    selectedLessonLocked,
    selectedLessonLock,
    selectedLessonIsQuiz,
    selectedLessonHasAssignment,
    selectedLessonAssignment,
    selectedAssignmentHistory,
    openQuizModal,
    openAssignmentModal,
    notice,
    playbackMax,
    playbackProgressPercent,
    currentTime,
    handleSeek,
    duration,
    handleToggleMute,
    isMuted,
    volume,
    handleVolumeChange,
    setSettingsOpen,
    handleCyclePlaybackRate,
    settingsOpen,
    playerConfig,
    handleSetPlaybackRate,
    videoQualitySources,
    handleSetVideoQuality,
    handleTogglePip,
    isPipActive,
    handleToggleFullscreen,
    isFrameFullscreen,
    handlePreviousLesson,
    previousLesson,
    handleNextLesson,
    nextLesson,
    setActiveTab,
    setOpenQuestionId,
    activeTab,
    loadingLesson,
    openSectionIds,
    setOpenSectionIds,
    progress,
    lessonProgressById,
    lessonLockMap,
    actualDurationByLessonId,
    assignmentHistoryByAssignmentId,
    handleSelectLesson,
    visibleQuestions,
    qnaSearch,
    setQnaSearch,
    setQnaStatusFilter,
    qnaStatusFilter,
    qnaError,
    loadingQna,
    qnaDetails,
    handleToggleQuestion,
    sessionUserId,
    questionForm,
    setQuestionForm,
    templateOptions,
    selectedTemplate,
    questionMessage,
    questionBusy,
    handleSubmitQuestion,
    setQuestionComposerOpen,
    activeQuestionSummary,
    loadingQuestionId,
    activeQuestionDetail,
    notePanelIsEmpty,
    setNoteComposerOpen,
    noteComposerOpen,
    noteContent,
    setNoteContent,
    handleSaveNote,
    sortedNotes,
    setOpenNoteId,
    setEditingNoteContent,
    handleDeleteNote,
    noteMessage,
    questionComposerOpen,
    assignmentModal,
    closeAssignmentModal,
    assignmentModalMethods,
    assignmentForm,
    setAssignmentForm,
    setAssignmentMessage,
    handleAssignmentFileDragOver,
    handleAssignmentFileDragLeave,
    handleAssignmentFileDrop,
    assignmentFileDragActive,
    handleAssignmentFilesSelected,
    handleAssignmentFileRemove,
    assignmentMessage,
    handleAssignmentSubmit,
    assignmentSubmitDisabled,
    assignmentSubmitBusy,
    assignmentLoadingVisible,
    assignmentLoadingText,
    assignmentGradingResult,
    assignmentGradingBadge,
    closeAssignmentGradingResult,
    assignmentGradingPassed,
    assignmentGradingScore,
    assignmentGradingReportRows,
    assignmentGradingFeedback,
    handleAssignmentResultPrimaryAction,
    assignmentResultPrimaryActionIcon,
    assignmentResultPrimaryActionLabel,
    completionVisible,
    completionProofCard,
    completionTheme,
    completionParticles,
    completionBurstKey,
    completionCardFlipped,
    setCompletionCardFlipped,
    completionRoadmapReturnHref,
    closeCompletionOverlay,
    quizModalLesson,
    activeQuizQuestion,
    closeQuizModal,
    quizQuestionIndex,
    quizModalQuestions,
    quizSelectedOptionIndex,
    quizFeedback,
    handleQuizOptionSelect,
    setQuizQuestionIndex,
    setQuizSelectedOptionIndex,
    setQuizFeedback,
    handleQuizNextQuestion,
    handleQuizCheckAnswer,
    activeNote,
    editingNoteContent,
    handleUpdateNote,
  }
}

export type LearningPlayerReadyModel = Extract<
  ReturnType<typeof useLearningPlayerController>,
  { status: 'ready' }
>
