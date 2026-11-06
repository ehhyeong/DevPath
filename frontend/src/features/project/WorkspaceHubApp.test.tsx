import { act, fireEvent, render, screen, within } from '@testing-library/react'
import axios from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProjectAsideSquad } from '../../components/ProjectAside'
import { SPA_NAVIGATION_EVENT } from '../../lib/spa-navigation'
import { projectApiRequest } from './api'
import WorkspaceHubApp from './WorkspaceHubApp'

vi.mock('./api', () => ({ projectApiRequest: vi.fn(), invalidateProjectApiCache: vi.fn() }))
vi.mock('axios', () => ({ default: { delete: vi.fn(), isAxiosError: () => false } }))
vi.mock('../../components/ProjectHeader', () => ({ default: () => null }))
vi.mock('../../components/ProjectAside', () => ({
  default: ({ mySquads = [] }: { mySquads?: ProjectAsideSquad[] }) => <aside>{mySquads.map(squad => <span key={squad.id}>{squad.name}</span>)}</aside>,
}))

const project = { projectId: 42, domId: 'workspace-42', menuId: 'workspace-menu-42', type: 'squad', status: 'progress', owner: true, canDelete: true, title: 'AI 공유 프로젝트', description: '팀 프로젝트', dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1', progressPercent: 0, footerKind: 'avatars', memberAvatarSeeds: [] }
let projects = [project]
let offline = false

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  localStorage.clear()
  window.history.replaceState({}, '', '/workspace-hub')
  const exp = Math.floor(Date.now() / 1000) + 3600
  const role = 'ROLE_LEARNER'
  const claims = btoa(JSON.stringify({ sub: '7', role, exp }))
  localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', userId: 7, name: '팀장', role, exp, storage: 'local' }))
  projects = [project]
  offline = false
  vi.mocked(projectApiRequest).mockReset().mockImplementation(async path => {
    if (path === '/api/workspaces/hub/projects') {
      if (offline) throw new Error('offline')
      return projects as never
    }
    return { mySquads: projects.map(item => ({ id: item.projectId, name: item.title, href: item.dashboardUrl })), user: { profileImage: null } } as never
  })
  vi.mocked(axios.delete).mockReset().mockImplementation(async () => {
    projects = []
    return { data: { success: true, data: null } } as never
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

async function openHub() {
  await act(async () => { render(<WorkspaceHubApp />) })
  expect(screen.getByRole('heading', { name: project.title })).toBeInTheDocument()
}

describe('워크스페이스 삭제와 팀원 허브 갱신', () => {
  it('팀장이 서버에서 삭제하면 열린 팀원 허브와 사이드바를 주기적으로 갱신한다', async () => {
    await openHub()
    projects = []
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(screen.queryByRole('heading', { name: project.title })).not.toBeInTheDocument()
    expect(screen.getByRole('complementary')).not.toHaveTextContent(project.title)
    expect(projectApiRequest).toHaveBeenCalledWith('/api/workspaces/hub/projects', expect.anything(), 'required', { cache: false })
  })

  it('허브로 포커스가 돌아오면 오래된 프로젝트 카드를 제거한다', async () => {
    await openHub()
    projects = []
    await act(async () => { window.dispatchEvent(new Event('focus')) })
    expect(screen.queryByRole('heading', { name: project.title })).not.toBeInTheDocument()
  })

  it('다른 화면에서는 폴링하지 않고 허브 재방문 시 갱신한다', async () => {
    await openHub()
    window.history.replaceState({}, '', '/home')
    const before = vi.mocked(projectApiRequest).mock.calls.length
    projects = []
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(vi.mocked(projectApiRequest).mock.calls).toHaveLength(before)
    window.history.replaceState({}, '', '/workspace-hub')
    await act(async () => { window.dispatchEvent(new Event(SPA_NAVIGATION_EVENT)) })
    expect(screen.queryByRole('heading', { name: project.title })).not.toBeInTheDocument()
  })

  it('일시적인 갱신 실패에는 기존 카드를 보존한다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await openHub()
    offline = true
    await act(async () => { window.dispatchEvent(new Event('focus')) })
    expect(screen.getByRole('heading', { name: project.title })).toBeInTheDocument()
  })

  it('생성자는 본인 나가기 대신 공유 워크스페이스 삭제 API를 호출한다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await openHub()
    const card = screen.getByRole('heading', { name: project.title }).closest('.project-card')!
    fireEvent.click(within(card as HTMLElement).getByRole('button'))
    await act(async () => { fireEvent.click(within(card as HTMLElement).getByRole('link', { name: '삭제하기' })) })
    expect(axios.delete).toHaveBeenCalledWith('/api/workspaces/42/settings', expect.anything())
    expect(screen.queryByRole('heading', { name: project.title })).not.toBeInTheDocument()
  })

  it('삭제 전에 시작한 조회가 늦게 끝나도 삭제한 카드를 다시 표시하지 않는다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await openHub()
    const original = vi.mocked(projectApiRequest).getMockImplementation()!
    let finishStale: ((value: typeof projects) => void) | undefined
    let delayNext = true
    vi.mocked(projectApiRequest).mockImplementation((...args) => {
      if (args[0] === '/api/workspaces/hub/projects' && delayNext) {
        delayNext = false
        return new Promise(resolve => { finishStale = resolve }) as never
      }
      return original(...args)
    })
    await act(async () => { window.dispatchEvent(new Event('focus')) })
    const card = screen.getByRole('heading', { name: project.title }).closest('.project-card')!
    fireEvent.click(within(card as HTMLElement).getByRole('button'))
    await act(async () => { fireEvent.click(within(card as HTMLElement).getByRole('link', { name: '삭제하기' })) })
    await act(async () => { finishStale!([project]) })
    expect(screen.queryByRole('heading', { name: project.title })).not.toBeInTheDocument()
  })
})
