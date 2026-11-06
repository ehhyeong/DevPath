import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SquadWorkspaceAside from './SquadWorkspaceAside'
import { projectApiRequest } from '../features/project/api'

vi.mock('../features/project/api', () => ({ projectApiRequest: vi.fn() }))
let counts = new Map([[42, 1], [43, 2]])
let linked = true

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  window.history.replaceState({}, '', '/squad-dashboard?workspaceId=42&ai=1')
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  counts = new Map([[42, 1], [43, 2]])
  linked = true
  vi.mocked(projectApiRequest).mockReset().mockImplementation(async path => {
    if (path.endsWith('/integrations')) return (linked ? [{ provider: 'GITHUB', isActive: true, repositoryUrl: 'https://github.com/test/repo' }] : []) as never
    if (path.endsWith('/ai-design')) return { demoWorkspace: false } as never
    const id = Number(path.match(/workspaces\/(\d+)/)?.[1])
    return { openReviews: Array.from({ length: counts.get(id) ?? 0 }, (_, index) => ({ reviewId: index + 1 })) } as never
  })
})

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })
const badge = () => screen.getByRole('link', { name: /코드 피드백/ }).querySelector('.squad-dashboard-review-badge')

describe('공통 사이드바의 열린 PR 수', () => {
  it('리뷰를 방문하지 않은 대시보드에서도 접힌 사이드바에 빨간 수를 표시한다', async () => {
    await act(async () => { render(<SquadWorkspaceAside activePage="dashboard" workspaceId={42} aiWorkspace />) })
    expect(badge()).toHaveTextContent('1')
    expect(badge()?.closest('.sidebar-text')).toBeNull()
    expect(projectApiRequest).toHaveBeenCalledWith('/api/workspaces/42/code-reviews', expect.anything(), 'required', { cache: false })
    fireEvent.mouseEnter(screen.getByRole('complementary'))
    expect(badge()).toHaveTextContent('1')
  })

  it('다른 메뉴에서도 새 PR과 닫힌 PR의 개수를 갱신한다', async () => {
    await act(async () => { render(<SquadWorkspaceAside activePage="dashboard" workspaceId={42} aiWorkspace />) })
    counts.set(42, 2)
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(badge()).toHaveTextContent('2')
    counts.set(42, 0)
    await act(async () => { window.dispatchEvent(new Event('focus')) })
    expect(badge()).toBeNull()
  })

  it('다른 워크스페이스에 이전 프로젝트의 수를 넘기지 않는다', async () => {
    let view: ReturnType<typeof render>
    await act(async () => { view = render(<SquadWorkspaceAside activePage="dashboard" workspaceId={42} aiWorkspace />) })
    expect(badge()).toHaveTextContent('1')
    window.history.replaceState({}, '', '/squad-dashboard?workspaceId=43&ai=1')
    await act(async () => { view.rerender(<SquadWorkspaceAside activePage="dashboard" workspaceId={43} aiWorkspace />) })
    expect(badge()).toHaveTextContent('2')
  })

  it('연동이 잠긴 프로젝트에는 리뷰 조회나 배지를 표시하지 않는다', async () => {
    linked = false
    await act(async () => { render(<SquadWorkspaceAside activePage="dashboard" workspaceId={42} aiWorkspace />) })
    expect(badge()).toBeNull()
    expect(vi.mocked(projectApiRequest).mock.calls.some(([path]) => path.endsWith('/code-reviews'))).toBe(false)
  })

  it('보존된 다른 메뉴의 사이드바는 중복으로 리뷰 목록을 폴링하지 않는다', async () => {
    await act(async () => { render(<><SquadWorkspaceAside activePage="dashboard" workspaceId={42} aiWorkspace /><SquadWorkspaceAside activePage="blueprint" workspaceId={42} aiWorkspace /></>) })
    const requests = () => vi.mocked(projectApiRequest).mock.calls.filter(([path]) => path.endsWith('/code-reviews')).length
    expect(requests()).toBe(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(requests()).toBe(2)
  })
})
