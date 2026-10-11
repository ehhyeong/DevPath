import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { navigateTo } from '../../lib/spa-navigation'
import type { WorkspaceAiDesign } from '../project/api'
import AiWorkspaceCreatedModal from './AiWorkspaceCreatedModal'

vi.mock('../../lib/spa-navigation', () => ({
  navigateTo: vi.fn(),
}))

const design: WorkspaceAiDesign = {
  title: '지역 행사 매칭 플랫폼',
  summary: '지역 행사와 참여자를 연결합니다.',
  difficulty: 'mvp',
  stack: {
    frontend: 'React',
    backend: 'Spring Boot',
    database: 'PostgreSQL',
    libraries: [],
    selectionReason: '서비스 요구사항에 적합합니다.',
  },
  scenario: {
    userFlows: [],
    coreFeatures: [],
  },
  architecture: {
    style: '모듈형 모놀리스',
    description: '도메인을 모듈로 분리합니다.',
    components: [],
    erdMermaid: 'erDiagram',
    entities: [
      { name: 'EVENT', purpose: '행사', columns: [] },
      { name: 'PARTICIPANT', purpose: '참여자', columns: [] },
    ],
    technicalChallenges: [],
  },
  apis: [
    { method: 'GET', path: '/api/events', description: '행사 조회', auth: 'USER', requestExample: '{}', responseExample: '{}' },
    { method: 'POST', path: '/api/events', description: '행사 생성', auth: 'USER', requestExample: '{}', responseExample: '{}' },
  ],
  roadmap: [
    { phase: 1, title: '기반 구현', goal: '기반 완성', estimatedWeeks: 1, tasks: ['프로젝트 설정', '인증 구현'] },
    { phase: 2, title: '핵심 기능', goal: 'MVP 완성', estimatedWeeks: 2, tasks: ['행사 조회'] },
  ],
  interviewQuestions: [
    { category: '설계', question: '모듈을 어떻게 나눴나요?', answer: '도메인별로 분리했습니다.', keywords: ['모듈'] },
  ],
}

describe('AiWorkspaceCreatedModal', () => {
  beforeEach(() => {
    vi.mocked(navigateTo).mockReset()
  })

  it('생성된 AI 설계의 자동 배치 개수와 워크스페이스 링크를 표시한다', () => {
    const onClose = vi.fn()
    render(<AiWorkspaceCreatedModal design={design} onClose={onClose} workspaceId={42} />)

    expect(screen.getByRole('heading', { name: '워크스페이스가 준비되었습니다' })).toBeInTheDocument()
    expect(screen.getByText('로드맵 기반 작업 카드 3개')).toBeInTheDocument()
    expect(screen.getByText('AI 추천 스키마 2개 테이블')).toBeInTheDocument()
    expect(screen.getByText('엔드포인트 2개')).toBeInTheDocument()
    expect(screen.getByText('Phase 2단계 마일스톤 + 작업 마감일')).toBeInTheDocument()
    expect(screen.getByText('실무 면접 예상 질문 1개')).toBeInTheDocument()
    expect(screen.getByText('AI 설계서 문서 5종')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /ERD 설계/ }))
    expect(navigateTo).toHaveBeenCalledWith('/squad-erd?workspaceId=42&ai=1')

    fireEvent.click(screen.getByRole('button', { name: 'AI 설계서 열기' }))
    expect(navigateTo).toHaveBeenCalledWith('/squad-blueprint?workspaceId=42&ai=1')

    fireEvent.click(screen.getByRole('button', { name: '대시보드 보기' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
