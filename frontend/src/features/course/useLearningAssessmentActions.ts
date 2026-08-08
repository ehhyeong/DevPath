import type { DragEvent, MutableRefObject } from 'react'
import { learnerAssignmentApi } from '../../lib/api/learner'
import type { LearningCourseDetail, LearningLesson, LearningLessonAssignment, LearningLessonProgress } from '../../types/learning'
import { buildAssignmentSubmissionPayload, createAssignmentFormState, isAssignmentLesson, isAssignmentSubmissionFormReady, resolveAssignmentSubmissionEmptyMessage, resolveLessonAssignment, type AssignmentGradingResultState, type PersistCompletionOptions, type QuizModalQuestion } from './learning-player-model'
import type { FlattenedLesson } from './learning-player-support'
import { useLearningAssessmentState } from './useLearningPlayerState'

type LessonLock = { locked: boolean; prerequisiteLessonId: number | null; prerequisiteLessonTitle: string | null }
type Props = {
  state: ReturnType<typeof useLearningAssessmentState>
  lesson: FlattenedLesson | null
  lessons: FlattenedLesson[]
  course: LearningCourseDetail | null
  duration: number
  lessonLockMap: Map<number, LessonLock>
  selectedLessonLocked: boolean
  previousLesson: FlattenedLesson | null
  nextLesson: FlattenedLesson | null
  quizModalLesson: FlattenedLesson | null
  quizModalLessonId: number | null
  quizModalQuestions: QuizModalQuestion[]
  activeQuizQuestion: QuizModalQuestion | null
  assignmentModalLesson: FlattenedLesson | null
  assignmentModal: LearningLessonAssignment | null
  assignmentResultNextLesson: FlattenedLesson | null
  assignmentResultProgressById: Record<number, LearningLessonProgress>
  assignmentResultCompletesCourse: boolean
  isStudentPreview: boolean
  sessionUserId: number | null
  quizScoreByLessonIdRef: MutableRefObject<Record<number, number>>
  setSelectedLessonId: (lessonId: number) => void
  setNotice: (message: string | null) => void
  persistCompletedLesson: (lessonId: number, totalSeconds: number, options?: PersistCompletionOptions) => void
  openCourseCompletionOverlay: (progressByLessonId: Record<number, LearningLessonProgress>, result?: AssignmentGradingResultState | null) => void
}

export function useLearningAssessmentActions(props: Props) {
  const { state, lesson, lessons, course, duration, lessonLockMap, selectedLessonLocked, previousLesson, nextLesson, quizModalLesson, quizModalLessonId, quizModalQuestions, activeQuizQuestion, assignmentModalLesson, assignmentModal, assignmentResultNextLesson, assignmentResultProgressById, assignmentResultCompletesCourse, isStudentPreview, sessionUserId, quizScoreByLessonIdRef, setSelectedLessonId, setNotice, persistCompletedLesson, openCourseCompletionOverlay } = props
  const { quizQuestionIndex, setQuizQuestionIndex, quizSelectedOptionIndex, setQuizSelectedOptionIndex, quizFeedback, setQuizFeedback, setQuizModalLessonId, assignmentModalLessonId, setAssignmentModalLessonId, assignmentForm, setAssignmentForm, setAssignmentFileDragActive, setAssignmentSubmitBusy, setAssignmentMessage, setAssignmentLoadingVisible, assignmentGradingResult, setAssignmentGradingResult, setAssignmentHistoryByAssignmentId, setCompletionVisible, setCompletionCardFlipped } = state

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

  return { markLessonCompletedForNavigation, openAssignmentModal, closeAssignmentModal, closeAssignmentGradingResult, openCompletionOverlay, closeCompletionOverlay, handleAssignmentResultPrimaryAction, openQuizModal, closeQuizModal, handleSelectLesson, handlePreviousLesson, handleNextLesson, handleQuizOptionSelect, handleQuizCheckAnswer, handleQuizNextQuestion, handleAssignmentFilesSelected, handleAssignmentFileDragOver, handleAssignmentFileDragLeave, handleAssignmentFileDrop, handleAssignmentFileRemove, handleAssignmentSubmit }
}
