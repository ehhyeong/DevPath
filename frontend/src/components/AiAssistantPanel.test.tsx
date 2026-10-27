import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AiAssistantPanel from './AiAssistantPanel'
import SquadWorkspaceAiPanel from './SquadWorkspaceAiPanel'
import { DEMO_TEXT } from '../lib/demo-typing'
import { userApi } from '../lib/api/auth'
import { getWorkspaceAiDesign, projectApiRequest } from '../features/project/api'

vi.mock('../lib/auth-session', async (original) => ({ ...await original<typeof import('../lib/auth-session')>(), readStoredAuthSession: () => ({ userId: 7 }) }))
vi.mock('../features/project/api', async (original) => ({ ...await original<typeof import('../features/project/api')>(), getWorkspaceAiDesign: vi.fn(), projectApiRequest: vi.fn() }))
beforeEach(() => {
  vi.spyOn(userApi, 'getMyProfile').mockResolvedValue({ userId: 7, email: 'kim.hakseup@devpath.com' } as never)
  vi.mocked(projectApiRequest).mockClear()
  vi.mocked(projectApiRequest).mockResolvedValue([] as never)
})
afterEach(() => vi.useRealTimers())

describe('AI 입력 시연', () => {
  it('저장된 대화를 불러오고 비우는 기존 기능과 시연 입력을 함께 유지한다', async () => {
    const loadMessages = vi.fn(async () => [{ role: 'bot' as const, text: '서버에 저장된 대화' }])
    const onReset = vi.fn(async () => {})
    render(<AiAssistantPanel fabLabel="AI 에이전트" panelTitle="저장된 대화" greeting="안내" resetGreeting="초기화"
      placeholder="입력" thinkingLabel="분석" suggestions={[]} loadMessages={loadMessages} onReset={onReset}
      demoPrompt={{ email: 'kim.hakseup@devpath.com', text: DEMO_TEXT.erd, instant: true }} />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'AI 에이전트' })))
    expect(screen.getByText('서버에 저장된 대화')).toBeInTheDocument()
    expect(loadMessages).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('textbox', { name: 'AI 에이전트 프롬프트 입력' }))
    expect(screen.getByRole('textbox', { name: 'AI 에이전트 프롬프트 입력' })).toHaveValue(DEMO_TEXT.erd)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '대화 비우기' })))
    expect(onReset).toHaveBeenCalledOnce()
    expect(screen.queryByText('서버에 저장된 대화')).not.toBeInTheDocument()
  })

  it('네비게이터 입력칸 클릭 시 조합 타이핑하고 전송은 별도 클릭으로 수행한다', async () => {
    const onAsk = vi.fn(async () => ({ text: '로드맵 제안입니다.' }))
    render(<AiAssistantPanel fabLabel="AI 네비게이터" panelTitle="로드맵" greeting="안내" resetGreeting="안내"
      placeholder="입력" thinkingLabel="분석" suggestions={[]} onAsk={onAsk}
      demoPrompt={{ email: 'kim.hakseup@devpath.com', text: DEMO_TEXT.roadmap }} />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'AI 네비게이터' })))
    const input = screen.getByRole('textbox', { name: 'AI 네비게이터 프롬프트 입력' })
    expect(input.tagName).toBe('TEXTAREA')
    expect(input).toHaveValue('')
    Object.defineProperty(input, 'scrollHeight', { configurable: true, value: 500 })
    vi.useFakeTimers()
    fireEvent.click(input)
    expect(input).toHaveValue('ㅍ')
    expect(screen.getByRole('button', { name: '전송' })).toBeDisabled()
    act(() => vi.advanceTimersByTime(10000))
    expect(input).toHaveValue(DEMO_TEXT.roadmap)
    expect((input as HTMLTextAreaElement).selectionEnd).toBe(DEMO_TEXT.roadmap.length)
    expect(input.scrollTop).toBe(500)
    expect(onAsk).not.toHaveBeenCalled()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '전송' })))
    expect(onAsk).toHaveBeenCalledWith(DEMO_TEXT.roadmap, [])
  })

  it('Shift+Enter와 한글 조합 Enter는 전송하지 않고 일반 Enter는 여러 줄을 전송한다', async () => {
    const onAsk = vi.fn(async () => ({ text: '답변' }))
    render(<AiAssistantPanel fabLabel="AI 네비게이터" panelTitle="로드맵" greeting="안내" resetGreeting="안내"
      placeholder="입력" thinkingLabel="분석" suggestions={[]} onAsk={onAsk} />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'AI 네비게이터' })))
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '첫 줄' } })
    expect(fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })).toBe(true)
    expect(onAsk).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: '첫 줄\n둘째 줄' } })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 })
    expect(onAsk).not.toHaveBeenCalled()
    await act(async () => { expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(false) })
    expect(onAsk).toHaveBeenCalledWith('첫 줄\n둘째 줄', [])
    expect(input).toHaveValue('')
    expect(screen.getByText('첫 줄\n둘째 줄', { normalizer: (text) => text })).toBeInTheDocument()
  })

  it('시연 타이핑 중 Shift+Enter로 줄바꿈을 시작하면 자동 입력을 멈춘다', async () => {
    const onAsk = vi.fn(async () => ({ text: '답변' }))
    render(<AiAssistantPanel fabLabel="AI 네비게이터" panelTitle="로드맵" greeting="안내" resetGreeting="안내"
      placeholder="입력" thinkingLabel="분석" suggestions={[]} onAsk={onAsk}
      demoPrompt={{ email: 'kim.hakseup@devpath.com', text: DEMO_TEXT.roadmap }} />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'AI 네비게이터' })))
    vi.useFakeTimers()
    const input = screen.getByRole('textbox')
    fireEvent.click(input)
    expect(input).toHaveValue('ㅍ')
    expect(fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })).toBe(true)
    fireEvent.change(input, { target: { value: 'ㅍ\n직접 입력' } })
    act(() => vi.advanceTimersByTime(5000))
    expect(input).toHaveValue('ㅍ\n직접 입력')
    expect(onAsk).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '전송' })).toBeEnabled()
  })

  it.each([true, false])('시연 ERD 여부 %s에 따라 요청문을 즉시 입력하고 다른 페이지로 넘기지 않는다', async (demoWorkspace) => {
    window.history.replaceState({}, '', '/squad-erd?workspaceId=42&ai=1')
    vi.mocked(getWorkspaceAiDesign).mockResolvedValue({ workspaceId: 42, demoWorkspace } as never)
    const view = render(<SquadWorkspaceAiPanel />)
    await act(async () => {})
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'AI 에이전트' })))
    const input = screen.getByRole('textbox', { name: 'AI 에이전트 프롬프트 입력' })
    fireEvent.click(input)
    expect(input).toHaveValue(demoWorkspace ? DEMO_TEXT.erd : '')
    expect(vi.mocked(projectApiRequest).mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(0)
    view.unmount()
    window.history.replaceState({}, '', '/squad-api?workspaceId=42&ai=1')
    render(<SquadWorkspaceAiPanel />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'AI 에이전트' })))
    fireEvent.click(screen.getByRole('textbox', { name: 'AI 에이전트 프롬프트 입력' }))
    expect(screen.getByRole('textbox', { name: 'AI 에이전트 프롬프트 입력' })).toHaveValue('')
  })
})
