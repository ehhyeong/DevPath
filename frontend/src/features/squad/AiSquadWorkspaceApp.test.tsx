import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AiSquadWorkspaceApp from './AiSquadWorkspaceApp'

vi.mock('./erd-support', () => ({
  loadMermaid: vi.fn(async () => ({
    render: vi.fn(async () => ({ svg: '<svg aria-label="ERD diagram"></svg>' })),
  })),
}))

describe('AI 설계서 탭', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/squad-blueprint?ai=1#roadmap')
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('roadmap 해시로 진입하면 개발 로드맵과 원본 면접 질문을 바로 표시한다', () => {
    render(<AiSquadWorkspaceApp />)

    expect(screen.getByRole('heading', { name: /개발 구현 로드맵/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /실무 면접 예상 질문/ })).toBeInTheDocument()
    expect(screen.getByText('예상 질문 3개')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /핵심 사용자 흐름/ })).not.toBeInTheDocument()
    const roadmapPanel = screen.getByRole('heading', { name: /개발 구현 로드맵/ }).closest('.ai-blueprint-tab-panel')
    expect(roadmapPanel).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^API 명세서$/ }))
    expect(window.location.hash).toBe('#api')
    expect(screen.getByText('API 명세서에서 상세 보기')).toBeInTheDocument()
    const apiPanel = screen.getByText('API 명세서에서 상세 보기').closest('.ai-blueprint-tab-panel')
    expect(apiPanel).toBeInTheDocument()
    expect(apiPanel).not.toBe(roadmapPanel)
  })
})

describe('AI API 명세서', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/squad-api?ai=1#A3')
  })

  it('해시 API의 원본 상세 구조를 표시하고 상태 변경과 추가 모달을 제공한다', () => {
    render(<AiSquadWorkspaceApp />)

    expect(screen.getByRole('heading', { name: '/api/series' })).toBeInTheDocument()
    expect(screen.getByText('완료 0 · 진행 2 / 9')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Parameters' })).toBeInTheDocument()
    expect(screen.getByText('tag')).toBeInTheDocument()
    expect(screen.getByText('cURL 예시')).toBeInTheDocument()
    expect(screen.getByText('AI 설계서 연결')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('A3 구현 상태'), { target: { value: 'done' } })
    expect(screen.getByText('22%')).toBeInTheDocument()
    expect(screen.getByText('완료 1 · 진행 2 / 9')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /엔드포인트 추가/ }))
    expect(screen.getByRole('dialog', { name: '엔드포인트 추가' })).toBeInTheDocument()
    expect(screen.getByLabelText('Method')).toBeInTheDocument()
    expect(screen.getByLabelText(/경로/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/경로/), { target: { value: '/api/test' } })
    fireEvent.change(screen.getByLabelText(/설명/), { target: { value: '테스트 엔드포인트' } })
    fireEvent.click(screen.getByRole('button', { name: '추가하기' }))
    expect(screen.queryByRole('dialog', { name: '엔드포인트 추가' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '/api/test' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#A10')
    expect(screen.getByRole('button', { name: '전체 10' })).toBeInTheDocument()
  })
})

describe('AI 스쿼드 로컬 상호작용', () => {
  it('면접 질문 추가와 모의 면접 시작 모달을 원본 흐름대로 제공한다', () => {
    window.history.replaceState({}, '', '/squad-interview?ai=1')
    render(<AiSquadWorkspaceApp />)

    fireEvent.click(screen.getByRole('button', { name: /AI에게 질문 더 받기/ }))
    expect(screen.getByRole('dialog', { name: 'AI에게 질문 더 받기' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'AI 질문 생성 닫기' }))

    fireEvent.click(screen.getByRole('button', { name: /직접 추가/ }))
    expect(screen.getByRole('dialog', { name: '팀 질문 추가' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('질문'), { target: { value: '트랜잭션 경계는 어떻게 정했나요?' } })
    fireEvent.change(screen.getByLabelText('핵심 키워드'), { target: { value: '트랜잭션, 정합성' } })
    fireEvent.click(screen.getByRole('button', { name: '추가하기' }))
    expect(screen.queryByRole('dialog', { name: '팀 질문 추가' })).not.toBeInTheDocument()
    expect(screen.getByText('Q. 트랜잭션 경계는 어떻게 정했나요?')).toBeInTheDocument()
    expect(screen.getByText('팀 추가')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /모의 면접 시작/ }))
    expect(screen.getByRole('dialog', { name: '모의 면접 설정' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /시작하기/ }))
    expect(screen.getByRole('dialog', { name: '모의 면접' })).toBeInTheDocument()
    expect(screen.getByLabelText('모의 면접 답변')).toBeInTheDocument()
  })

  it('새 작업을 로컬 칸반의 할 일 열에 추가한다', () => {
    window.history.replaceState({}, '', '/squad-workspace?ai=1')
    render(<AiSquadWorkspaceApp />)

    fireEvent.click(screen.getByRole('button', { name: /새 작업/ }))
    expect(screen.getByRole('dialog', { name: '새 작업 추가' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('작업 제목'), { target: { value: 'README 배포 문서 작성' } })
    fireEvent.change(screen.getByLabelText('담당자 배정'), { target: { value: '이태형' } })
    fireEvent.click(screen.getByRole('button', { name: '저장하기' }))
    expect(screen.queryByRole('dialog', { name: '새 작업 추가' })).not.toBeInTheDocument()
    expect(screen.getByText('README 배포 문서 작성')).toBeInTheDocument()
    expect(screen.getByText('DP-15')).toBeInTheDocument()
  })

  it('AI 설계서 PDF 저장 버튼이 브라우저 인쇄를 실행한다', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    window.history.replaceState({}, '', '/squad-blueprint?ai=1')
    render(<AiSquadWorkspaceApp />)

    fireEvent.click(screen.getByRole('button', { name: /PDF 저장/ }))
    expect(print).toHaveBeenCalledOnce()
    print.mockRestore()
  })

  it('원본 ERD 편집 화면과 관계 설정 모달을 제공한다', async () => {
    window.history.replaceState({}, '', '/squad-erd?ai=1')
    render(<AiSquadWorkspaceApp />)

    expect(screen.getByRole('heading', { name: 'ERD Architect Pro' })).toBeInTheDocument()
    expect((screen.getByLabelText('schema.mermaid Live Editor') as HTMLTextAreaElement).value).toContain('MEMBER ||--o{ SERIES')
    expect(await screen.findByLabelText('ERD diagram')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /테이블 추가/ }))
    expect(screen.getByLabelText('NEW_TABLE 테이블 이름')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /관계 연결/ }))
    expect(screen.getByRole('dialog', { name: '관계 설정' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '취소' }))

    fireEvent.click(screen.getByRole('button', { name: 'ERD 도움말' }))
    expect(screen.getByRole('dialog', { name: 'DevPath ERD 가이드북' })).toBeInTheDocument()
  })
})
