import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SquadHubApp from './SquadHubApp'
import { projectApiRequest } from '../project/api'

vi.mock('../project/api', () => ({ projectApiRequest: vi.fn() }))
vi.mock('../../lib/useAuthSession', () => ({ useAuthSession: () => [{ userId: 9, accessToken: 'member-token' }] }))

vi.mock('./AiSquadWorkspaceApp', () => ({
  default: () => <div>AI 전용 스쿼드 워크스페이스</div>,
}))

vi.mock('./SquadWorkspaceTools', () => ({
  default: ({ workspaceId }: { workspaceId: number }) => <div>공통 소통 도구 {workspaceId}</div>,
}))

vi.mock('./pages', () => {
  const StandardDashboard = () => <div>일반 스쿼드 워크스페이스</div>
  const LazyPage = () => <div>스쿼드 메뉴</div>
  const loadLazyPage = () => Promise.resolve({ default: LazyPage })

  return {
    squadDashboardPage: StandardDashboard,
    squadPageLoaders: {
      '/squad-dashboard': () => Promise.resolve({ default: StandardDashboard }),
      '/squad-blueprint': loadLazyPage,
      '/squad-workspace': loadLazyPage,
      '/squad-review': loadLazyPage,
      '/squad-erd': loadLazyPage,
      '/squad-api': loadLazyPage,
      '/squad-schedule': loadLazyPage,
      '/squad-files': loadLazyPage,
      '/squad-meeting': loadLazyPage,
      '/squad-interview': loadLazyPage,
      '/squad-settings': loadLazyPage,
    },
  }
})

describe('SquadHubApp 화면 선택', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/squad-dashboard?workspaceId=42')
    vi.mocked(projectApiRequest).mockReset().mockResolvedValue([{ projectId: 42, dashboardUrl: '/squad-dashboard?workspaceId=42' }])
  })

  it('저장된 AI 워크스페이스는 원본 HTML 기반 AI 화면을 사용한다', () => {
    window.history.replaceState({}, '', '/squad-dashboard?workspaceId=42&ai=1')
    render(<SquadHubApp />)

    expect(screen.getByText('AI 전용 스쿼드 워크스페이스')).toBeInTheDocument()
    expect(screen.queryByText('일반 스쿼드 워크스페이스')).not.toBeInTheDocument()
    expect(screen.getAllByText('공통 소통 도구 42')).toHaveLength(1)
  })

  it('일반 워크스페이스는 기존 Squad 대시보드를 유지한다', async () => {
    render(<SquadHubApp />)

    expect(await screen.findByText('일반 스쿼드 워크스페이스')).toBeInTheDocument()
    expect(screen.getAllByText('공통 소통 도구 42')).toHaveLength(1)
  })

  it('워크스페이스 정보가 없으면 공통 소통 도구를 표시하지 않는다', () => {
    window.history.replaceState({}, '', '/squad-dashboard')
    render(<SquadHubApp />)
    expect(screen.queryByText(/공통 소통 도구/)).not.toBeInTheDocument()
  })

  it('초대받은 팀원이 AI 표시 없는 설계서 링크로 들어와도 저장된 AI 레이아웃을 사용한다', async () => {
    window.history.replaceState({}, '', '/squad-blueprint?workspaceId=42&source=invite#roadmap')
    vi.mocked(projectApiRequest).mockResolvedValue([{ projectId: 42, dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1' }])
    render(<SquadHubApp />)
    expect(screen.queryByText('스쿼드 메뉴')).not.toBeInTheDocument()
    expect(await screen.findByText('AI 전용 스쿼드 워크스페이스')).toBeInTheDocument()
    expect(projectApiRequest).toHaveBeenCalledWith('/api/workspaces/hub/projects', expect.anything(), 'required', { cache: false })
    expect(window.location.pathname).toBe('/squad-blueprint')
    expect(window.location.hash).toBe('#roadmap')
    expect(new URLSearchParams(window.location.search).get('source')).toBe('invite')
    expect(new URLSearchParams(window.location.search).get('ai')).toBe('1')
  })

  it('다른 가입 프로젝트가 AI여도 현재 일반 프로젝트의 레이아웃은 바꾸지 않는다', async () => {
    vi.mocked(projectApiRequest).mockResolvedValue([
      { projectId: 43, dashboardUrl: '/squad-dashboard?workspaceId=43&ai=1' },
      { projectId: 42, dashboardUrl: '/squad-dashboard?workspaceId=42' },
    ])
    render(<SquadHubApp />)
    expect(await screen.findByText('일반 스쿼드 워크스페이스')).toBeInTheDocument()
    expect(screen.queryByText('AI 전용 스쿼드 워크스페이스')).not.toBeInTheDocument()
  })

  it('정보 조회 실패를 예전 화면으로 대체하지 않고 재시도로 복구한다', async () => {
    vi.mocked(projectApiRequest).mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce([{ projectId: 42, dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1' }])
    render(<SquadHubApp />)
    fireEvent.click(await screen.findByRole('button', { name: '다시 시도' }))
    expect(screen.queryByText('일반 스쿼드 워크스페이스')).not.toBeInTheDocument()
    expect(await screen.findByText('AI 전용 스쿼드 워크스페이스')).toBeInTheDocument()
  })
})
