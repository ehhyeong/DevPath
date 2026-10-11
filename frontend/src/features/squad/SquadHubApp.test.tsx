import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SquadHubApp from './SquadHubApp'

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
  })

  it('저장된 AI 워크스페이스는 원본 HTML 기반 AI 화면을 사용한다', () => {
    window.history.replaceState({}, '', '/squad-dashboard?workspaceId=42&ai=1')
    render(<SquadHubApp />)

    expect(screen.getByText('AI 전용 스쿼드 워크스페이스')).toBeInTheDocument()
    expect(screen.queryByText('일반 스쿼드 워크스페이스')).not.toBeInTheDocument()
    expect(screen.getAllByText('공통 소통 도구 42')).toHaveLength(1)
  })

  it('일반 워크스페이스는 기존 Squad 대시보드를 유지한다', () => {
    render(<SquadHubApp />)

    expect(screen.getByText('일반 스쿼드 워크스페이스')).toBeInTheDocument()
    expect(screen.getAllByText('공통 소통 도구 42')).toHaveLength(1)
  })

  it('워크스페이스 정보가 없으면 공통 소통 도구를 표시하지 않는다', () => {
    window.history.replaceState({}, '', '/squad-dashboard')
    render(<SquadHubApp />)
    expect(screen.queryByText(/공통 소통 도구/)).not.toBeInTheDocument()
  })
})
