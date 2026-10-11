import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { readStoredAuthSession } from '../../lib/auth-session'
import { showAuthToast } from '../../lib/auth-toast'
import { projectApiRequest } from '../project/api'

export type InterviewQuestion = {
  id: string
  category: string
  question: string
  answer: string
  keywords: string[]
  level: number
  source?: 'ai' | 'generated' | 'team'
  apis?: string[]
  tasks?: string[]
  from?: string
  erd?: string
}

export type InterviewAnswer = {
  text: string
  favorite: boolean
  rating: number
  feedback?: string
  score?: number
  versions: { text: string; at: string }[]
}
export type InterviewAnswers = Record<string, InterviewAnswer>
export const emptyInterviewAnswer: InterviewAnswer = { text: '', favorite: false, rating: 0, versions: [] }

function readAnswers(storageKey: string): InterviewAnswers {
  try { return JSON.parse(localStorage.getItem(storageKey) ?? '{}') as InterviewAnswers }
  catch { return {} }
}

export type InterviewSessionResult = { id: string; at: string; questions: string[]; scores: number[]; average: number }

export function useInterviewAnswers(workspaceId: number | null) {
  const userId = readStoredAuthSession()?.userId
  const storageKey = `devpath.interview.${userId ?? 'guest'}.${workspaceId ?? 'demo'}`
  const persisted = Boolean(workspaceId && userId)
  const [record, setRecord] = useState(() => ({ storageKey, answers: persisted ? {} as InterviewAnswers : readAnswers(storageKey), sessions: [] as InterviewSessionResult[], ready: !persisted, error: '' }))
  if (record.storageKey !== storageKey) setRecord({ storageKey, answers: persisted ? {} : readAnswers(storageKey), sessions: [], ready: !persisted, error: '' })
  const latest = useRef(record)
  const saved = useRef('')
  const pending = useRef<Promise<unknown>>(Promise.resolve())
  useEffect(() => { latest.current = record }, [record])
  useEffect(() => {
    if (!persisted) return
    let ignore = false
    projectApiRequest<{ content: string }>(`/api/workspaces/${workspaceId}/interview/practice`, {}, 'required').then((response) => {
      const state = JSON.parse(response.content) as { answers: InterviewAnswers; sessions: InterviewSessionResult[] }
      if (!ignore) { saved.current = JSON.stringify(state); setRecord({ storageKey, ...state, ready: true, error: '' }) }
    }).catch((error) => { if (!ignore) setRecord({ storageKey, answers: {}, sessions: [], ready: false, error: error instanceof Error ? error.message : '연습 기록을 불러오지 못했습니다.' }) })
    return () => { ignore = true }
  }, [persisted, storageKey, workspaceId])

  const saveLatest = useCallback(() => {
    const current = latest.current
    if (!persisted || !current.ready || current.storageKey !== storageKey) return
    const content = JSON.stringify({ answers: current.answers, sessions: current.sessions })
    if (content === saved.current) return
    saved.current = content
    // 입력 저장 요청을 직렬화해 늦게 도착한 이전 답변이 최신 답변을 덮어쓰지 못하게 한다.
    pending.current = pending.current.catch(() => undefined).then(() => projectApiRequest(`/api/workspaces/${workspaceId}/interview/practice`, { method: 'PUT', body: JSON.stringify({ content }) }, 'required')).catch((error) => {
      saved.current = ''
      showAuthToast({ message: error instanceof Error ? error.message : '연습 기록을 저장하지 못했습니다.', variant: 'error' })
    })
  }, [persisted, storageKey, workspaceId])
  useEffect(() => {
    if (!persisted) {
      if (record.storageKey === storageKey) {
        try { localStorage.setItem(storageKey, JSON.stringify(record.answers)) }
        catch { showAuthToast({ message: '브라우저 저장 공간에 연습 기록을 저장하지 못했습니다.', variant: 'error' }) }
      }
      return
    }
    const timer = window.setTimeout(saveLatest, 500)
    return () => window.clearTimeout(timer)
  }, [persisted, record, storageKey, saveLatest])
  // 메뉴 이동 시 대기 중인 개인 기록을 전송하며 요청 큐는 응답 순서를 유지한다.
  useEffect(() => () => saveLatest(), [saveLatest])
  const setAnswers: Dispatch<SetStateAction<InterviewAnswers>> = (update) => setRecord((current) => ({ ...current, answers: typeof update === 'function' ? update(current.answers) : update }))
  const setSessions: Dispatch<SetStateAction<InterviewSessionResult[]>> = (update) => setRecord((current) => ({ ...current, sessions: typeof update === 'function' ? update(current.sessions) : update }))
  return [record.answers, setAnswers, record.sessions, setSessions, record.ready, record.error] as const
}

export function matchedInterviewKeywords(question: InterviewQuestion, answer: InterviewAnswer) {
  return question.keywords.filter((keyword) => answer.text.toLowerCase().includes(keyword.toLowerCase()))
}
