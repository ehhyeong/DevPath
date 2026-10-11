import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WorkspaceProjectStartModal from './WorkspaceProjectStartModal'
import { createWorkspaceFromAiDesign, getWorkspaceAiDesignJob, startWorkspaceAiDesignJob, type WorkspaceAiDesign, type WorkspaceAiDesignJob } from './api'
import { navigateTo } from '../../lib/spa-navigation'

vi.mock('../../lib/spa-navigation', () => ({
  navigateTo: vi.fn(),
}))

vi.mock('./api', () => ({
  createWorkspaceFromAiDesign: vi.fn(),
  getWorkspaceAiDesignJob: vi.fn(),
  startWorkspaceAiDesignJob: vi.fn(),
}))

const generatedDesign: WorkspaceAiDesign = {
  title: '지역 기반 반려동물 진료 예약 플랫폼',
  summary: '보호자가 병원 진료 시간을 조회하고 예약하는 서비스입니다.',
  difficulty: 'mvp',
  stack: {
    frontend: 'React',
    backend: 'Java / Spring Boot',
    database: 'PostgreSQL',
    libraries: ['Spring Security', 'Redis'],
    selectionReason: '예약 정합성과 인증 처리를 안정적으로 구현하기 위한 구성입니다.',
  },
  scenario: {
    userFlows: [{ actor: '보호자', action: '가까운 병원을 조회하고 진료를 예약합니다.' }],
    coreFeatures: ['진료 가능 시간 조회', '중복 예약 방지'],
  },
  architecture: {
    style: '모듈형 모놀리스',
    description: '예약과 병원 도메인의 경계를 분리합니다.',
    components: [{ name: '예약 모듈', responsibility: '예약 생성과 취소를 처리합니다.' }],
    erdMermaid: 'erDiagram\nUSER ||--o{ RESERVATION : makes',
    entities: [{
      name: 'RESERVATION',
      purpose: '진료 예약 저장',
      columns: [{ name: 'id', type: 'bigint', constraints: 'PK', description: '예약 식별자' }],
    }],
    technicalChallenges: ['같은 진료 시간의 동시 예약을 방지해야 합니다.'],
  },
  apis: [{
    method: 'POST',
    path: '/api/reservations',
    description: '진료 예약을 생성합니다.',
    auth: 'USER',
    requestExample: '{"scheduleId":1}',
    responseExample: '{"reservationId":10}',
  }],
  roadmap: [{
    phase: 1,
    title: '예약 도메인 구현',
    goal: '중복 없는 예약 생성',
    estimatedWeeks: 1,
    tasks: ['예약 엔티티와 유니크 제약 구현'],
  }],
  interviewQuestions: [{
    category: '동시성',
    question: '중복 예약을 어떻게 방지했나요?',
    answer: '유니크 제약과 비관적 락을 함께 사용했습니다.',
    keywords: ['유니크 제약', '비관적 락'],
  }],
}

const pendingJob: WorkspaceAiDesignJob = {
  jobId: 'job-1',
  status: 'PENDING',
  result: null,
  errorMessage: null,
  createdAt: '2026-10-04T12:00:00Z',
  completedAt: null,
}

const completedJob: WorkspaceAiDesignJob = {
  ...pendingJob,
  status: 'COMPLETED',
  result: generatedDesign,
  completedAt: '2026-10-04T12:01:00Z',
}

describe('WorkspaceProjectStartModal AI 설계', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.mocked(getWorkspaceAiDesignJob).mockReset()
    vi.mocked(startWorkspaceAiDesignJob).mockReset()
    vi.mocked(createWorkspaceFromAiDesign).mockReset()
    vi.mocked(navigateTo).mockReset()
  })

  it('백그라운드 작업을 시작하고 완료된 실제 AI 응답을 표시한다', async () => {
    vi.mocked(startWorkspaceAiDesignJob).mockResolvedValue(pendingJob)
    vi.mocked(getWorkspaceAiDesignJob).mockResolvedValue(completedJob)
    render(<WorkspaceProjectStartModal open onClose={vi.fn()} onOpen={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /AI에게 주제 추천받기/ }))
    fireEvent.click(screen.getByRole('button', { name: /사용자가 직접 설정/ }))
    fireEvent.change(screen.getByLabelText('Frontend'), { target: { value: 'React' } })
    fireEvent.change(screen.getByLabelText('Backend'), { target: { value: 'Java / Spring Boot' } })
    fireEvent.change(screen.getByLabelText('Database'), { target: { value: 'PostgreSQL' } })
    fireEvent.change(screen.getByLabelText('만들고 싶은 서비스 아이디어'), {
      target: { value: '우리 동네 동물병원 예약 서비스' },
    })
    fireEvent.click(screen.getByRole('button', { name: /AI 설계 시작하기/ }))

    expect(await screen.findByRole('heading', { name: generatedDesign.title })).toBeInTheDocument()
    expect(screen.getByText(generatedDesign.summary)).toBeInTheDocument()
    expect(screen.queryByText('독립 출판 콘텐츠 구독 플랫폼')).not.toBeInTheDocument()
    expect(startWorkspaceAiDesignJob).toHaveBeenCalledWith({
      difficulty: 'mvp',
      stackMode: 'manual',
      frontend: 'React',
      backend: 'Java / Spring Boot',
      database: 'PostgreSQL',
      idea: '우리 동네 동물병원 예약 서비스',
    })
    expect(getWorkspaceAiDesignJob).toHaveBeenCalledWith('job-1', expect.any(AbortSignal))
    expect(window.localStorage.getItem('devpath.workspace-hub.ai-design-job-id')).toBe('job-1')

    fireEvent.click(screen.getByRole('button', { name: '아키텍처 & DB' }))
    expect(screen.getByText('같은 진료 시간의 동시 예약을 방지해야 합니다.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'API 명세서' }))
    expect(screen.getByText('/api/reservations')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '개발 로드맵 & 면접' }))
    expect(screen.getByText(/중복 예약을 어떻게 방지했나요/)).toBeInTheDocument()
  })

  it('모달을 닫아도 우측 하단에서 진행 상태를 계속 표시한다', async () => {
    const onClose = vi.fn()
    vi.mocked(startWorkspaceAiDesignJob).mockResolvedValue(pendingJob)
    vi.mocked(getWorkspaceAiDesignJob).mockResolvedValue({ ...pendingJob, status: 'PROCESSING' })
    const { rerender } = render(<WorkspaceProjectStartModal open onClose={onClose} onOpen={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /AI에게 주제 추천받기/ }))
    fireEvent.click(screen.getByRole('button', { name: /AI 설계 시작하기/ }))

    const backgroundButton = await screen.findByRole('button', { name: /백그라운드에서 계속/ })
    expect(screen.queryByText('AI 설계 작업 중')).not.toBeInTheDocument()
    fireEvent.click(backgroundButton)
    expect(onClose).toHaveBeenCalledOnce()

    rerender(<WorkspaceProjectStartModal open={false} onClose={onClose} onOpen={vi.fn()} />)
    expect(screen.getByText('AI 설계 작업 중')).toBeInTheDocument()
    expect(screen.getByText(/창을 닫거나 다른 작업을 하셔도 됩니다/)).toBeInTheDocument()
  })

  it('설계 진행 화면의 닫기 버튼으로 모달을 닫을 때 상태 카드를 표시한다', async () => {
    const onClose = vi.fn()
    vi.mocked(startWorkspaceAiDesignJob).mockResolvedValue(pendingJob)
    vi.mocked(getWorkspaceAiDesignJob).mockResolvedValue({ ...pendingJob, status: 'PROCESSING' })
    const { rerender } = render(<WorkspaceProjectStartModal open onClose={onClose} onOpen={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /AI에게 주제 추천받기/ }))
    fireEvent.click(screen.getByRole('button', { name: /AI 설계 시작하기/ }))
    await screen.findByRole('button', { name: /백그라운드에서 계속/ })
    expect(screen.queryByText('AI 설계 작업 중')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /닫기/ }))
    rerender(<WorkspaceProjectStartModal open={false} onClose={onClose} onOpen={vi.fn()} />)

    expect(screen.getByText('AI 설계 작업 중')).toBeInTheDocument()
  })

  it('설계 시작 버튼을 빠르게 연속 입력해도 작업을 한 번만 생성한다', () => {
    vi.mocked(startWorkspaceAiDesignJob).mockReturnValue(new Promise(() => undefined))
    render(<WorkspaceProjectStartModal open onClose={vi.fn()} onOpen={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /AI에게 주제 추천받기/ }))
    const startButton = screen.getByRole('button', { name: /AI 설계 시작하기/ })
    fireEvent.click(startButton)
    fireEvent.click(startButton)

    expect(startWorkspaceAiDesignJob).toHaveBeenCalledOnce()
  })

  it('허브를 다시 열면 저장된 작업을 조회해 완료 알림을 복원한다', async () => {
    window.localStorage.setItem('devpath.workspace-hub.ai-design-job-id', 'job-1')
    vi.mocked(getWorkspaceAiDesignJob).mockResolvedValue(completedJob)

    render(<WorkspaceProjectStartModal open={false} onClose={vi.fn()} onOpen={vi.fn()} />)

    expect(await screen.findByText('AI 설계가 완료됐어요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '결과 보기' })).toBeInTheDocument()
    expect(getWorkspaceAiDesignJob).toHaveBeenCalledWith('job-1', expect.any(AbortSignal))
  })

  it('작업 시작 실패 메시지를 표시하고 설정 화면으로 돌아간다', async () => {
    vi.mocked(startWorkspaceAiDesignJob).mockRejectedValue(new Error('Gemini 호출이 지연되고 있습니다.'))
    render(<WorkspaceProjectStartModal open onClose={vi.fn()} onOpen={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /AI에게 주제 추천받기/ }))
    fireEvent.click(screen.getByRole('button', { name: /AI 설계 시작하기/ }))

    expect(await screen.findByText('Gemini 호출이 지연되고 있습니다.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '설정 수정' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /AI 설계 시작하기/ })).toBeInTheDocument()
    })
  })

  it('완료 설계로 실제 워크스페이스를 생성한다', async () => {
    vi.mocked(startWorkspaceAiDesignJob).mockResolvedValue(pendingJob)
    vi.mocked(getWorkspaceAiDesignJob).mockResolvedValue(completedJob)
    vi.mocked(createWorkspaceFromAiDesign).mockResolvedValue({
      workspaceId: 42,
      dashboardUrl: '/squad-dashboard?workspaceId=42',
      createdAt: '2026-10-05T00:00:00Z',
      design: generatedDesign,
    })
    render(<WorkspaceProjectStartModal open onClose={vi.fn()} onOpen={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /AI에게 주제 추천받기/ }))
    fireEvent.click(screen.getByRole('button', { name: /AI 설계 시작하기/ }))
    fireEvent.click(await screen.findByRole('button', { name: /워크스페이스 생성/ }))

    await waitFor(() => expect(createWorkspaceFromAiDesign).toHaveBeenCalledWith('job-1'))
    expect(navigateTo).toHaveBeenCalledWith('/squad-dashboard?workspaceId=42&ai=1&created=ai')
  })
})
