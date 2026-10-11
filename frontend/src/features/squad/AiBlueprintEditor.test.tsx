import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AiBlueprintEditor from './AiBlueprintEditor'
import type { WorkspaceAiDesign } from '../project/api'

const design: WorkspaceAiDesign = {
  title: '안전 플랫폼', summary: '위험 신고', difficulty: 'mvp',
  stack: { frontend: 'React', backend: 'Spring', database: 'Postgres', libraries: [], selectionReason: '정합성' },
  scenario: { userFlows: [{ actor: '주민', action: '신고' }], coreFeatures: ['로그인', '신고'], featureIds: ['F1', 'F3'], nextFeatureNumber: 4 },
  architecture: { style: '모놀리스', description: '계층 구조', components: [], erdMermaid: 'erDiagram', entities: [], technicalChallenges: [] },
  apis: [], roadmap: [{ phase: 1, title: '신고 구현', goal: '신고 API', estimatedWeeks: 2, tasks: ['API 구현'] }], interviewQuestions: [],
}

describe('AI 설계서 편집', () => {
  it('기능 삭제·추가 후 기존 번호와 편집 시작 설계를 함께 저장한다', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const cancel = vi.fn()
    render(<AiBlueprintEditor design={design} section="scenario" onSave={save} onCancel={cancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'F1 기능 삭제' }))
    fireEvent.change(screen.getByLabelText('F3'), { target: { value: '위치 기반 신고' } })
    fireEvent.click(screen.getByRole('button', { name: '+ MVP 기능 추가' }))
    fireEvent.change(screen.getByLabelText('새 기능'), { target: { value: '조회' } })
    fireEvent.click(screen.getByRole('button', { name: '변경사항 저장' }))
    await waitFor(() => expect(cancel).toHaveBeenCalledOnce())
    expect(save).toHaveBeenCalledWith({ expectedDesign: design, planning: { title: design.title, summary: design.summary, userFlows: design.scenario.userFlows, features: [{ id: 'F3', title: '위치 기반 신고' }, { id: null, title: '조회' }] } })
    expect(design.scenario.coreFeatures).toEqual(['로그인', '신고'])
  })

  it('충돌하면 입력을 유지하고 취소는 저장하지 않는다', async () => {
    const save = vi.fn().mockRejectedValue(new Error('다른 팀원이 수정했습니다.'))
    const cancel = vi.fn()
    render(<AiBlueprintEditor design={design} section="scenario" onSave={save} onCancel={cancel} />)
    fireEvent.change(screen.getByLabelText('프로젝트 이름'), { target: { value: '수정한 이름' } })
    fireEvent.click(screen.getByRole('button', { name: '변경사항 저장' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('다른 팀원이 수정했습니다.'))
    expect(screen.getByLabelText('프로젝트 이름')).toHaveValue('수정한 이름')
    expect(cancel).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(cancel).toHaveBeenCalledOnce()
    expect(save).toHaveBeenCalledOnce()
  })

  it('로드맵은 번호와 작업 계획만 보내며 날짜와 소요 주수를 덮어쓰지 않는다', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    render(<AiBlueprintEditor design={design} section="roadmap" onSave={save} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Phase 1 이름'), { target: { value: '인증 구현' } })
    fireEvent.change(screen.getByLabelText('Phase 1 작업 계획 (한 줄에 하나)'), { target: { value: '회원가입\n로그인' } })
    fireEvent.click(screen.getByRole('button', { name: '변경사항 저장' }))
    await waitFor(() => expect(save).toHaveBeenCalledWith({ expectedDesign: design, roadmap: [{ phase: 1, title: '인증 구현', goal: '신고 API', tasks: ['회원가입', '로그인'] }] }))
  })
})
