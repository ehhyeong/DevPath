import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MyRoadmapBuilderPage from './MyRoadmapBuilderPage'
import { userApi } from '../../lib/api/auth'
import { roadmapApi } from '../../lib/api/roadmap'

vi.mock('../../components/SiteHeader', () => ({ default: () => null }))
vi.mock('../../components/AiAssistantPanel', () => ({ default: () => null }))
vi.mock('../../lib/auth-session', () => ({
  AUTH_SESSION_SYNC_EVENT: 'devpath:auth-session-sync',
  readStoredAuthSession: vi.fn().mockReturnValue({ userId: 7, name: '김학습', accessToken: 'test-token' }),
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

describe('로드맵 저장 후 계속 편집', () => {
  async function createBranchedRoadmap() {
    vi.mocked(roadmapApi.getOfficialRoadmapDetail).mockResolvedValueOnce({
      roadmapId: 1, title: '프론트엔드', isOfficial: true, createdAt: '2026-11-08T12:00:00',
      nodes: ['HTML CSS', 'JavaScript', 'React', 'TypeScript'].map((title, index) => ({ nodeId: index + 1, roadmapId: 1, title, sortOrder: index })),
    })
    const view = render(<MyRoadmapBuilderPage />)
    view.container.querySelector('main')!.scrollTo = vi.fn()
    fireEvent.click(await screen.findByRole('button', { name: 'HTML CSS 추가' }))
    fireEvent.click(screen.getByTitle('이 위치에 분기 추가'))
    fireEvent.click(screen.getByRole('button', { name: 'JavaScript 추가' }))
    fireEvent.click(screen.getByRole('button', { name: 'React 추가' }))
    const canvas = view.container.querySelector('.builder-timeline') as HTMLElement
    return { ...view, canvas }
  }

  async function saveAs(title: string) {
    fireEvent.click(screen.getByRole('button', { name: '로드맵 저장' }))
    fireEvent.change(screen.getByPlaceholderText('예: 내 백엔드 개발자 로드맵'), { target: { value: title } })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '저장' })) })
  }

  it('신규 저장과 계속 편집 후 노드·분기를 보존하고 추가한 구성도 다시 저장한다', async () => {
    const { canvas } = await createBranchedRoadmap()
    const beforeSave = canvas.textContent
    await saveAs('첫 번째 설계')
    expect(screen.getByText('저장 완료!')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '계속 편집하기' }))
    expect(canvas.textContent).toBe(beforeSave)
    for (const title of ['HTML CSS', 'JavaScript', 'React']) expect(within(canvas).getByLabelText(title, { exact: true })).toBeInTheDocument()
    const firstPayload = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))
    expect(firstPayload.modules).toEqual([
      { builderModuleId: null, originalNodeId: 1, sortOrder: 1, laneKey: 1 },
      { builderModuleId: null, originalNodeId: 2, sortOrder: 1, laneKey: 2 },
      { builderModuleId: null, originalNodeId: 3, sortOrder: 2, laneKey: null },
    ])
    fireEvent.click(screen.getByRole('button', { name: 'TypeScript 추가' }))
    await saveAs('추가 편집한 설계')
    const secondPayload = JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body))
    expect(secondPayload.modules).toEqual([...firstPayload.modules, { builderModuleId: null, originalNodeId: 4, sortOrder: 3, laneKey: null }])
    fireEvent.click(screen.getByRole('button', { name: '계속 편집하기' }))
    expect(within(canvas).getByLabelText('TypeScript', { exact: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'HTML CSS 추가됨' })).toBeInTheDocument()
  })

  it('저장이 실패해도 캔버스와 분기를 보존한다', async () => {
    const { canvas } = await createBranchedRoadmap()
    const beforeSave = canvas.textContent
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ message: '저장 실패 확인' }) } as Response)
    await saveAs('실패할 설계')
    expect(screen.getByText('저장 실패 확인')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(canvas.textContent).toBe(beforeSave)
    expect(screen.getByRole('button', { name: '로드맵 저장' })).toBeEnabled()
  })

  it('기존 로드맵을 수정 저장하고 계속 편집해도 노드를 보존한다', async () => {
    window.history.replaceState({}, '', '/my-roadmap?edit=11')
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
      myRoadmapId: 11, customRoadmapId: 10, title: '기존 설계', modules: [{ source: 'OFFICIAL_NODE', originalNodeId: 1, builderModuleId: null, moduleId: 'official-1', category: '프론트엔드', title: 'HTML CSS', icon: 'fas fa-code', color: 'text-green-500', bgColor: 'bg-green-50', topics: [], sortOrder: 1, laneKey: null }],
    } }) } as Response)
    const view = render(<MyRoadmapBuilderPage />)
    const canvas = view.container.querySelector('.builder-timeline') as HTMLElement
    await within(canvas).findByLabelText('HTML CSS', { exact: true })
    const beforeSave = canvas.textContent
    fireEvent.click(screen.getByRole('button', { name: '로드맵 수정' }))
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '저장' })) })
    expect(fetch).toHaveBeenLastCalledWith('/api/builder/roadmaps/11', expect.objectContaining({ method: 'PUT' }))
    fireEvent.click(screen.getByRole('button', { name: '계속 편집하기' }))
    expect(canvas.textContent).toBe(beforeSave)
  })
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
