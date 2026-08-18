import { useEffect, type MutableRefObject } from 'react'
import { learnerAssignmentApi, qnaApi } from '../../lib/api/learner'
import type { SubmissionHistoryItem } from '../../types/learning'
import type { QnaQuestionDetail } from '../../types/qna'
import { buildQnaRealtimeWebSocketUrl, createQuestionFormState, LESSON_LOAD_TIMEOUT_MS, QNA_LOAD_TIMEOUT_MS, requestWithTimeout, type QnaRealtimeEvent } from './learning-player-model'
import { useLearningAssessmentState, useLearningCourseState, useLearningNotesAndQnaState } from './useLearningPlayerState'

type Props = {
  courseState: ReturnType<typeof useLearningCourseState>
  notesState: ReturnType<typeof useLearningNotesAndQnaState>
  assessmentState: ReturnType<typeof useLearningAssessmentState>
  isStudentPreview: boolean
  sessionUserId: number | null
  openQuestionIdRef: MutableRefObject<number | null>
  qnaDetailsRef: MutableRefObject<Record<number, QnaQuestionDetail>>
  refreshQnaQuestion: (questionId: number, options?: { showLoading?: boolean }) => Promise<void>
}

export function useLearningSupplementalLoader(props: Props) {
  const { courseState, notesState, assessmentState, isStudentPreview, sessionUserId, openQuestionIdRef, qnaDetailsRef, refreshQnaQuestion } = props
  const { session, course } = courseState
  const { setQnaQuestions, setQnaDetails, setQnaError, setLoadingQna, setQuestionForm, setQnaTemplates } = notesState
  const { setAssignmentHistoryByAssignmentId } = assessmentState

  useEffect(() => {
    if (isStudentPreview || !sessionUserId) {
      setAssignmentHistoryByAssignmentId({})
      return
    }
    let cancelled = false
    const userId = sessionUserId

    async function loadAssignmentHistory() {
      try {
        const history = await requestWithTimeout(LESSON_LOAD_TIMEOUT_MS, (signal) => learnerAssignmentApi.getSubmissionHistory(userId, signal))
        if (cancelled) return
        const nextHistoryByAssignmentId = history.submissions.reduce<Record<number, SubmissionHistoryItem>>((acc, item) => {
          const current = acc[item.assignmentId]
          const currentSubmittedAt = current?.submittedAt ?? ''
          const nextSubmittedAt = item.submittedAt ?? ''
          if (!current || nextSubmittedAt > currentSubmittedAt || item.submissionId > current.submissionId) acc[item.assignmentId] = item
          return acc
        }, {})
        setAssignmentHistoryByAssignmentId(nextHistoryByAssignmentId)
      } catch {
        if (!cancelled) setAssignmentHistoryByAssignmentId({})
      }
    }

    void loadAssignmentHistory()
    return () => { cancelled = true }
  }, [isStudentPreview, sessionUserId, setAssignmentHistoryByAssignmentId])

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
        setQuestionForm((current) => ({ ...current, templateType: current.templateType || templatesResult.value[0]?.templateType || '' }))
      } else {
        setQnaTemplates([])
      }
      setLoadingQna(false)
    }

    void loadQna()
    return () => { cancelled = true }
  }, [course?.courseId, isStudentPreview, session?.accessToken, setLoadingQna, setQnaDetails, setQnaError, setQnaQuestions, setQnaTemplates, setQuestionForm])

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
        if (event.courseId !== courseId || typeof event.questionId !== 'number') return
        setQnaQuestions((current) => current.map((item) => item.id === event.questionId
          ? { ...item, qnaStatus: 'ANSWERED', answerCount: Math.max(item.answerCount, 1) }
          : item))
        if (openQuestionIdRef.current === event.questionId || qnaDetailsRef.current[event.questionId]) void refreshQnaQuestion(event.questionId)
      }
      socket.onclose = () => {
        if (!closed) reconnectTimeoutId = window.setTimeout(connect, 3000)
      }
      socket.onerror = () => socket?.close()
    }

    connect()
    return () => {
      closed = true
      window.clearTimeout(reconnectTimeoutId)
      socket?.close()
    }
  }, [course?.courseId, isStudentPreview, openQuestionIdRef, qnaDetailsRef, refreshQnaQuestion, session?.accessToken, setQnaQuestions])
}
