import { describe, expect, it } from 'vitest'
import { resolveInterviewEvidence, type InterviewEvidence } from './interview-evidence'

const evidence: InterviewEvidence = { tasks: [{ id: 'DP-101', title: '신고 저장', status: 'todo' }], apis: [{ id: 'A-team', method: 'POST', path: '/reports' }], tables: ['REPORTS'] }
const question = { id: 'Q1', category: '핵심 난제', question: '중복 방지는?', answer: '요청 검증', keywords: [], level: 3, tasks: ['DP-101'], apis: ['POST /reports'], erd: 'REPORTS' }

describe('면접 질문의 실제 근거', () => {
  it('실제 작업 상태로 구현 전·진행 중·코드 근거를 구분한다', () => {
    expect(resolveInterviewEvidence(question, evidence).state).toBe('todo')
    for (const status of ['progress', 'review', 'done'] as const) {
      expect(resolveInterviewEvidence(question, { ...evidence, tasks: [{ ...evidence.tasks[0], status }] }).state).toBe(status === 'progress' ? 'progress' : 'done')
    }
  })

  it('실제 목록에 없는 작업·API·테이블을 표시하지 않는다', () => {
    const linked = resolveInterviewEvidence({ ...question, tasks: ['DP-1'], apis: ['A9'], erd: 'SUBSCRIPTION' }, evidence)
    expect(linked.tasks).toEqual([])
    expect(linked.apis).toEqual([])
    expect(linked.table).toBeUndefined()
    expect(linked.state).toBe('none')
    expect(resolveInterviewEvidence({ ...question, apis: undefined, from: 'POST /reports-archive' }, evidence).apis).toEqual([])
  })

  it('이전 질문의 정확한 API 출처만 복원하고 같은 경로의 다른 메서드를 붙이지 않는다', () => {
    const linked = resolveInterviewEvidence({ ...question, tasks: [], apis: undefined, erd: '', from: 'POST /reports' }, { ...evidence, apis: [...evidence.apis, { id: 'A-get', method: 'GET', path: '/reports' }] })
    expect(linked.apis.map((api) => api.id)).toEqual(['A-team'])
    expect(linked.state).toBe('none')
  })

  it('이전 테이블 출처를 복원하되 사용자가 명시적으로 연결을 해제하면 복원하지 않는다', () => {
    expect(resolveInterviewEvidence({ ...question, erd: undefined, from: 'REPORTS 테이블' }, evidence).table).toBe('REPORTS')
    expect(resolveInterviewEvidence({ ...question, erd: '', from: 'REPORTS 테이블' }, evidence).table).toBeUndefined()
  })
})
