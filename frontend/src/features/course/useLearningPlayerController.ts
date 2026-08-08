import { useCallback, useDeferredValue, useEffect, useEffectEvent, useMemo, useRef } from 'react'
import { lessonSessionApi, nodeClearanceApi, qnaApi } from '../../lib/api/learner'
import { warmupOcrWorker } from '../../lib/videoOcr'
import type { LearningLesson, LearningLessonProgress } from '../../types/learning'
import type { QnaQuestionDetail } from '../../types/qna'
import { ASSIGNMENT_LOADING_MESSAGES, buildAssignmentResultReportRows, buildCelebrationParticles, buildCompletionProofCard, buildQuizModalQuestions, clampPercent, createAssignmentFormState, getAvailableVideoQuality, getProofCardTheme, getVideoErrorMessage, isAbortError, isAssignmentLesson, isAssignmentSubmissionFormReady, isCourse127DemoCourse, isLessonProgressCompleted, isNativeKeyboardControlTarget, isOwnQnaQuestion, isPlaybackBlockedError, isQuestionAnswered, isQuizLesson, isSampleVideoUrl, readEnabledSearchParam, readNonNegativeNumberSearchParam, readOptionalSafeReturnHref, readSafeReturnHref, readStudentPreviewFromLocation, readVideoDuration, resolveAssignmentHistoryScorePercent, resolveAssignmentResultBadge, resolveAssignmentResultPassed, resolveAssignmentResultScore, resolveAssignmentResultScorePercent, resolveAssignmentReviewFeedback, resolveAssignmentSubmissionMethods, resolveLessonAssignment, resolveVideoQualitySources, resolveVideoUrl, toQuestionSummary, type AssignmentGradingResultState, type PersistCompletionOptions } from './learning-player-model'
import { createDefaultProgress, getFlattenedLessons, getProgressStorageKey, readNumberSearchParam, writeJsonStorage } from './learning-player-support'
import { useLearningPlayerEnvironment } from './useLearningPlayerEnvironment'
import { useLearningCourseLoader } from './useLearningCourseLoader'
import { useLearningSupplementalLoader } from './useLearningSupplementalLoader'
import { useLearningAssessmentState,useLearningCourseState,useLearningNotesAndQnaState,useLearningPlaybackState } from './useLearningPlayerState'
import { useLearningNotesAndQnaActions } from './useLearningNotesAndQnaActions'
import { useLearningAssessmentActions } from './useLearningAssessmentActions'
import { useLearningPlaybackActions } from './useLearningPlaybackActions'

export function useLearningPlayerController() {
const initialCourseId = useMemo(() => readNumberSearchParam('courseId'), [])
  const initialLessonId = useMemo(() => readNumberSearchParam('lessonId'), [])
  const isStudentPreview = useMemo(() => readStudentPreviewFromLocation(), [])
  const initialTimestampSeconds = useMemo(() => readNonNegativeNumberSearchParam('t'), [])
  const shouldAutoplayPreview = useMemo(() => isStudentPreview && readEnabledSearchParam('autoplay'), [isStudentPreview])

  const courseState = useLearningCourseState(initialLessonId)
  const { session,setSession,course,courseError,selectedLessonId,setSelectedLessonId,activeTab,setActiveTab,openSectionIds,setOpenSectionIds,notice,setNotice,loadingCourse,loadingLesson,loadingLessonProgressMap,progress,setProgress,lessonProgressById,setLessonProgressById,playerConfig,setPlayerConfig } = courseState
  const playbackState = useLearningPlaybackState()
  const { settingsOpen,setSettingsOpen,selectedVideoQuality,setSelectedVideoQuality,currentTime,setCurrentTime,duration,setDuration,actualDurationByLessonId,setActualDurationByLessonId,isPlaying,setIsPlaying,isMuted,setIsMuted,volume,isPipActive,setIsPipActive,isFrameFullscreen,setIsFrameFullscreen,ocrBusy,isSelectMode,setIsSelectMode,selectDrag,setSelectDrag,videoFailed,setVideoFailed } = playbackState
  const notesAndQnaState = useLearningNotesAndQnaState()
  const { notes,noteContent,setNoteContent,noteComposerOpen,setNoteComposerOpen,noteMessage,setNoteMessage,qnaTemplates,qnaQuestions,setQnaQuestions,qnaDetails,setQnaDetails,loadingQna,qnaError,setQnaError,qnaStatusFilter,setQnaStatusFilter,qnaSearch,setQnaSearch,openQuestionId,setOpenQuestionId,loadingQuestionId,setLoadingQuestionId,questionForm,setQuestionForm,questionMessage,setQuestionMessage,questionBusy,questionComposerOpen,setQuestionComposerOpen,openNoteId,setOpenNoteId,editingNoteContent,setEditingNoteContent } = notesAndQnaState
  const assessmentState = useLearningAssessmentState()
  const { quizModalLessonId,quizQuestionIndex,setQuizQuestionIndex,quizSelectedOptionIndex,setQuizSelectedOptionIndex,quizFeedback,setQuizFeedback,assignmentModalLessonId,setAssignmentModalLessonId,assignmentForm,setAssignmentForm,assignmentFileDragActive,assignmentSubmitBusy,assignmentMessage,setAssignmentMessage,assignmentLoadingVisible,setAssignmentLoadingVisible,assignmentLoadingText,setAssignmentLoadingText,assignmentGradingResult,setAssignmentGradingResult,assignmentHistoryByAssignmentId,completionProofCard,setCompletionProofCard,completionVisible,setCompletionVisible,completionCardFlipped,setCompletionCardFlipped,completionBurstKey,setCompletionBurstKey } = assessmentState

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
  }, [course, lesson, setOpenSectionIds])
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
  }, [activeVideoQuality, selectedVideoQuality, setSelectedVideoQuality])
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
  }, [course, lessons, selectedVideoQuality, setActualDurationByLessonId])
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
  }, [setLoadingQuestionId, setQnaDetails, setQnaError, setQnaQuestions])

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
  }, [calculateCourseCompletionScore, course, isCourseCompletedByProgress, lessons, setCompletionBurstKey, setCompletionCardFlipped, setCompletionProofCard, setCompletionVisible])

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
  }, [isStudentPreview, mergeLessonProgress, openCourseCompletionOverlay, playerConfig?.defaultPlaybackRate, playerConfig?.pipEnabled, setLessonProgressById, setProgress])

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
  useLearningCourseLoader({ courseState, playbackState, notesState: notesAndQnaState, initialCourseId, initialLessonId, isStudentPreview, lessons, lesson, selectedLessonLocked, shouldResumePlayback, resolveInitialPlaybackSeconds, mergeLessonProgress, resumeTimeRef, lastRenderedSecondRef, completedPersistedLessonIdRef })
  useLearningSupplementalLoader({ courseState, notesState: notesAndQnaState, assessmentState, isStudentPreview, sessionUserId, openQuestionIdRef, qnaDetailsRef, refreshQnaQuestion })

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
  }, [course, firstUnlockedLessonId, lessonLockMap, lessons, loadingLessonProgressMap, selectedLessonId, setNotice, setSelectedLessonId])

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
  }, [lesson, selectedLessonLocked, setAssignmentForm, setAssignmentGradingResult, setAssignmentLoadingVisible, setAssignmentMessage, setAssignmentModalLessonId])

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
  }, [assignmentLoadingVisible, setAssignmentLoadingText])

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
  }, [getPlaybackLimit, isStudentPreview, lesson, persistCompletedLesson, playerConfig?.defaultPlaybackRate, resolvedVideoUrl, setActualDurationByLessonId, setCurrentTime, setDuration, setIsMuted, setIsPipActive, setIsPlaying, setNotice, setVideoFailed, shouldAutoplayPreview, shouldResumePlayback])

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
  }, [noteMessage, notice, questionMessage, setNoteMessage, setNotice, setQuestionMessage])

  // OCR 워커 미리 초기화 (첫 클릭 지연 최소화)
  useEffect(() => { warmupOcrWorker() }, [])

  const { handleTogglePlaySafe,handleRetryVideoLoad,handleOcr,handleToggleMute,handleVolumeChange,handleSeek,handleTogglePip,handleToggleFullscreen,handleCyclePlaybackRate,handleSetPlaybackRate,handleSetVideoQuality } = useLearningPlaybackActions({ state: playbackState, lesson, resolvedVideoUrl, playerConfig, setPlayerConfig, videoQualitySources, activeVideoQuality, setNotice, getPlaybackLimit, videoRef, frameRef, resumeTimeRef, lastRenderedSecondRef, pendingVideoLoadRef, resumePlaybackAfterQualitySwitchRef })

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
  }, [setIsFrameFullscreen])

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
  }, [assignmentModalLessonId, completionVisible, quizModalLessonId, resolvedVideoUrl, selectedLessonIsQuiz, setIsSelectMode, setSelectDrag])

  const assessmentActions = useLearningAssessmentActions({ state: assessmentState, lesson, lessons, course, duration, lessonLockMap, selectedLessonLocked, previousLesson, nextLesson, quizModalLesson, quizModalLessonId, quizModalQuestions, activeQuizQuestion, assignmentModalLesson, assignmentModal, assignmentResultNextLesson, assignmentResultProgressById, assignmentResultCompletesCourse, isStudentPreview, sessionUserId, quizScoreByLessonIdRef, setSelectedLessonId, setNotice, persistCompletedLesson, openCourseCompletionOverlay })
  const { openAssignmentModal,closeAssignmentModal,closeAssignmentGradingResult,closeCompletionOverlay,handleAssignmentResultPrimaryAction,openQuizModal,closeQuizModal,handleSelectLesson,handlePreviousLesson,handleNextLesson,handleQuizOptionSelect,handleQuizCheckAnswer,handleQuizNextQuestion,handleAssignmentFilesSelected,handleAssignmentFileDragOver,handleAssignmentFileDragLeave,handleAssignmentFileDrop,handleAssignmentFileRemove,handleAssignmentSubmit } = assessmentActions

  const { handleToggleQuestion,handleSaveNote,handleDeleteNote,handleUpdateNote,handleSubmitQuestion } = useLearningNotesAndQnaActions({ state: notesAndQnaState, lesson, course, currentTime, isStudentPreview, sessionUserId, setActiveTab })

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
