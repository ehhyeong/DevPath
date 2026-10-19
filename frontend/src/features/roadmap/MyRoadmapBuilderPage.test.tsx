import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MyRoadmapBuilderPage from './MyRoadmapBuilderPage'
import { userApi } from '../../lib/api/auth'

vi.mock('../../components/SiteHeader', () => ({ default: () => null }))
vi.mock('../../components/AiAssistantPanel', () => ({ default: () => null }))
vi.mock('../../lib/auth-session', () => ({
  AUTH_SESSION_SYNC_EVENT: 'devpath:auth-session-sync',
  readStoredAuthSession: () => ({ userId: 7, name: '김학습', accessToken: 'test-token' }),
  clearStoredAuthSession: vi.fn(),
}))
vi.mock('../../lib/api/auth', () => ({
  userApi: { getMyProfile: vi.fn() }, authApi: { logout: vi.fn() },
}))
vi.mock('../../lib/api/roadmap', () => ({ roadmapApi: {
  getHubCatalog: vi.fn(async () => ({ sections: [{ active: true, title: '프론트엔드', sortOrder: 0, items: [
    { active: true, linkedRoadmapId: 1, title: '프론트엔드 개발자', sortOrder: 0 },
  ] }] })),
  getOfficialRoadmapDetail: vi.fn(async () => ({ roadmapId: 1, title: '프론트엔드', nodes: [
    { nodeId: 1, roadmapId: 1, title: 'HTML CSS', sortOrder: 0 },
  ] })),
} }))

beforeEach(() => {
  window.history.replaceState({}, '', '/my-roadmap')
  vi.mocked(userApi.getMyProfile).mockResolvedValue({
    userId: 7, name: '김학습', email: 'kim.hakseup@devpath.com', role: 'ROLE_LEARNER',
    profileImage: null, bio: null, phone: null, channelName: null, githubUrl: null, blogUrl: null, tags: [],
  })
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ data: { customRoadmapId: 10 } }) })))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

async function openTitleModal() {
  const view = render(<MyRoadmapBuilderPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'HTML CSS 추가' }))
  fireEvent.click(screen.getByRole('button', { name: '로드맵 저장' }))
  const input = screen.getByPlaceholderText('예: 내 백엔드 개발자 로드맵')
  vi.useFakeTimers()
  return { ...view, input }
}

describe('시연용 로드맵 제목 입력', () => {
  it('자동 포커스는 비워 두고 클릭부터 자모를 조합해 약 1.3초 내 완성하며 전체 제목을 저장한다', async () => {
    const { input } = await openTitleModal()
    act(() => vi.advanceTimersByTime(100))
    expect(input).toHaveValue('')
    fireEvent.click(input)
    expect(input).toHaveValue('ㅍ')
    act(() => vi.advanceTimersByTime(45))
    expect(input).toHaveValue('프')
    act(() => vi.advanceTimersByTime(45))
    expect(input).toHaveValue('프ㄹ')
    act(() => vi.advanceTimersByTime(90))
    expect(input).toHaveValue('프론')
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(fetch).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1120))
    expect(input).toHaveValue('프론트엔드 개발자 로드맵')
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '저장' })))
    const [, request] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(String(request?.body))).toMatchObject({
      title: '프론트엔드 개발자 로드맵', modules: [{ originalNodeId: 1 }],
    })
    expect(screen.getByText('저장 완료!')).toBeInTheDocument()
  })

  it('키보드·직접 입력이 시작되면 자동 입력을 중단하고 변경한 값을 보존한다', async () => {
    const { input } = await openTitleModal()
    fireEvent.click(input)
    act(() => vi.advanceTimersByTime(90))
    fireEvent.keyDown(input, { key: 'Backspace' })
    fireEvent.change(input, { target: { value: '직접 입력한 로드맵' } })
    act(() => vi.advanceTimersByTime(2000))
    expect(input).toHaveValue('직접 입력한 로드맵')
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.click(input)
    act(() => vi.advanceTimersByTime(2000))
    expect(input).toHaveValue('')
  })

  it('모달을 닫으면 중단하고 새로 열어 클릭하면 다시 시작하며 언마운트 시 타이머를 해제한다', async () => {
    const { input, unmount } = await openTitleModal()
    fireEvent.click(input)
    act(() => vi.advanceTimersByTime(90))
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    act(() => vi.advanceTimersByTime(2000))
    fireEvent.click(screen.getByRole('button', { name: '로드맵 저장' }))
    const reopened = screen.getByPlaceholderText('예: 내 백엔드 개발자 로드맵')
    expect(reopened).toHaveValue('')
    fireEvent.click(reopened)
    expect(reopened).toHaveValue('ㅍ')
    act(() => vi.advanceTimersByTime(100))
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('다른 계정은 클릭해도 자동 입력하지 않는다', async () => {
    const profile = await userApi.getMyProfile()
    vi.mocked(userApi.getMyProfile).mockResolvedValue({ ...profile, email: 'other@devpath.com' })
    const { input } = await openTitleModal()
    fireEvent.click(input)
    act(() => vi.advanceTimersByTime(2000))
    expect(input).toHaveValue('')
  })

  it('기존 입력값을 덮어쓰지 않는다', async () => {
    const { input } = await openTitleModal()
    fireEvent.change(input, { target: { value: '기존 제목' } })
    fireEvent.click(input)
    act(() => vi.advanceTimersByTime(2000))
    expect(input).toHaveValue('기존 제목')
  })

  it('편집 모드에서는 기존 제목을 지워도 자동 입력하지 않는다', async () => {
    window.history.replaceState({}, '', '/my-roadmap?edit=11')
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ data: { title: '기존 제목', modules: [] } }) } as Response)
    render(<MyRoadmapBuilderPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'HTML CSS 추가' }))
    fireEvent.click(screen.getByRole('button', { name: '로드맵 수정' }))
    const input = screen.getByPlaceholderText('예: 내 백엔드 개발자 로드맵')
    expect(input).toHaveValue('기존 제목')
    vi.useFakeTimers()
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.click(input)
    act(() => vi.advanceTimersByTime(2000))
    expect(input).toHaveValue('')
  })
})
