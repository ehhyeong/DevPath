import type { AiApi, AiTask } from './ai-squad-data'
import type { InterviewQuestion } from './interview-practice'

export type InterviewEvidence = {
  tasks: Pick<AiTask, 'id' | 'title' | 'status'>[]
  apis: Pick<AiApi, 'id' | 'method' | 'path'>[]
  tables: string[]
}
export type InterviewEvidenceLinks = Pick<InterviewQuestion, 'tasks' | 'apis' | 'erd'>
export const emptyInterviewEvidence: InterviewEvidence = { tasks: [], apis: [], tables: [] }
export const taskEvidenceStyles = {
  todo: { label: '할 일', badge: 'border-gray-200 bg-gray-50 text-gray-500' },
  progress: { label: '진행 중', badge: 'border-blue-200 bg-blue-50 text-blue-600' },
  review: { label: '리뷰', badge: 'border-amber-200 bg-amber-50 text-amber-600' },
  done: { label: '완료', badge: 'border-green-200 bg-green-50 text-green-700' },
}
export const proofStyles = {
  none: { label: '연결된 작업 없음', icon: 'fa-minus', color: 'text-gray-500' },
  todo: { label: '구현 전', icon: 'fa-exclamation-triangle', color: 'text-orange-500' },
  progress: { label: '구현 진행 중', icon: 'fa-spinner', color: 'text-blue-500' },
  done: { label: '코드 근거 있음', icon: 'fa-code', color: 'text-brand' },
}

export function resolveInterviewEvidence(question: InterviewQuestion, evidence: InterviewEvidence) {
  const tasks = evidence.tasks.filter((task) => question.tasks?.some((reference) => reference === task.id || reference === task.title))
  const apis = evidence.apis.filter((api) => {
    const reference = `${api.method} ${api.path}`
    const escaped = reference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // /reports가 /reports/{id}나 /reports-archive의 근거로 잘못 연결되지 않도록 경계를 확인한다.
    const from = question.from && new RegExp(`(^|\\s)${escaped}(?=$|\\s|[·,;])`).test(question.from)
    return question.apis?.some((value) => value === api.id || value === reference)
      || (!question.apis && from)
  })
  const table = evidence.tables.find((name) => question.erd === name || (question.erd == null && question.from === `${name} 테이블`))
  const state = !tasks.length ? 'none' : tasks.some((task) => task.status === 'done' || task.status === 'review') ? 'done' : tasks.some((task) => task.status === 'progress') ? 'progress' : 'todo'
  return { tasks, apis, table, state: state as keyof typeof proofStyles }
}
