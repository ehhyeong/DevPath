import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { koreanTypingFrames, startDemoTyping, DEMO_TEXT } from './demo-typing'
import { useDemoAccount, useDemoTyping } from './useDemoTyping'
import { userApi } from './api/auth'
import { readStoredAuthSession, AUTH_SESSION_SYNC_EVENT } from './auth-session'

vi.mock('./api/auth', () => ({ userApi: { getMyProfile: vi.fn() } }))
vi.mock('./auth-session', () => ({ readStoredAuthSession: vi.fn(), AUTH_SESSION_SYNC_EVENT: 'demo-auth-sync' }))

beforeEach(() => vi.mocked(readStoredAuthSession).mockReturnValue(null))
afterEach(() => vi.useRealTimers())

function Fields({ enabled = true, active = true, scopeKey = 1, instant = false, initial = '' }) {
  const [title, setTitle] = useState(initial)
  const [body, setBody] = useState('')
  const first = useDemoTyping({ text: '프론', value: title, onValue: setTitle, enabled, active, scopeKey, instant })
  const second = useDemoTyping({ text: DEMO_TEXT.meeting, value: body, onValue: setBody, enabled, active, scopeKey, instant: true })
  return <><input aria-label="제목" value={title} {...first.bindings} /><textarea aria-label="본문" value={body} {...second.bindings} />
    <button disabled={first.typing || second.typing}>저장</button><button onClick={() => setTitle('외부에서 바꾼 제목')}>템플릿 적용</button></>
}

describe('한글 시연 입력', () => {
  it('초성·중성·종성과 복합 모음·받침을 조합하고 영어·줄바꿈을 보존한다', () => {
    expect(koreanTypingFrames('프론')).toEqual(['ㅍ', '프', '프ㄹ', '프로', '프론'])
    expect(koreanTypingFrames('왕 값')).toEqual(['ㅇ', '오', '와', '왕', '왕 ', '왕 ㄱ', '왕 가', '왕 갑', '왕 값'])
    expect(koreanTypingFrames('API\n프').at(-1)).toBe('API\n프')
  })

  it('긴 답변은 2.5초로 압축하지 않고 길이에 비례해 끝내며 취소 후에는 값을 쓰지 않는다', () => {
    vi.useFakeTimers()
    const value = vi.fn()
    const done = vi.fn()
    startDemoTyping(DEMO_TEXT.answerContent, value, done)
    act(() => vi.advanceTimersByTime(2500))
    expect(done).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(10000))
    expect(value).toHaveBeenLastCalledWith(DEMO_TEXT.answerContent)
    expect(done).toHaveBeenCalledOnce()
    const cancel = startDemoTyping('취소 테스트', value, done)
    cancel()
    value.mockClear()
    act(() => vi.advanceTimersByTime(10000))
    expect(value).not.toHaveBeenCalled()
  })

  it('제목을 클릭해도 본문은 시작하지 않고 본문을 클릭하면 해당 칸만 즉시 채운다', () => {
    vi.useFakeTimers()
    render(<Fields />)
    fireEvent.focus(screen.getByLabelText('제목'))
    expect(screen.getByLabelText('제목')).toHaveValue('')
    fireEvent.click(screen.getByLabelText('제목'))
    expect(screen.getByLabelText('제목')).toHaveValue('ㅍ')
    expect(screen.getByLabelText('본문')).toHaveValue('')
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
    act(() => vi.advanceTimersByTime(1400))
    expect(screen.getByLabelText('제목')).toHaveValue('프론')
    fireEvent.click(screen.getByLabelText('본문'))
    expect(screen.getByLabelText('본문')).toHaveValue(DEMO_TEXT.meeting)
    expect(screen.getByLabelText('본문').tagName).toBe('TEXTAREA')
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled()
  })

  it('즉시 입력도 클릭한 빈 칸에만 적용하고 키 입력·기존 값을 덮어쓰지 않는다', () => {
    render(<Fields instant />)
    fireEvent.click(screen.getByLabelText('제목'))
    expect(screen.getByLabelText('제목')).toHaveValue('프론')
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '수동 입력' } })
    fireEvent.keyDown(screen.getByLabelText('제목'), { key: 'a' })
    expect(screen.getByLabelText('제목')).toHaveValue('수동 입력')
    expect(screen.getByLabelText('본문')).toHaveValue('')
  })

  it('직접 입력하거나 템플릿을 선택하면 진행 중 타이핑을 멈춘다', () => {
    vi.useFakeTimers()
    render(<Fields />)
    fireEvent.click(screen.getByLabelText('제목'))
    fireEvent.click(screen.getByRole('button', { name: '템플릿 적용' }))
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByLabelText('제목')).toHaveValue('외부에서 바꾼 제목')
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '' } })
    fireEvent.click(screen.getByLabelText('제목'))
    act(() => vi.advanceTimersByTime(2000))
    expect(screen.getByLabelText('제목')).toHaveValue('')
  })

  it('수동 키와 한글 조합 시작 시 중단하고 진행 중 Enter 제출을 막는다', () => {
    vi.useFakeTimers()
    const { rerender } = render(<Fields />)
    const input = screen.getByLabelText('제목')
    fireEvent.click(input)
    expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(false)
    fireEvent.compositionStart(input)
    act(() => vi.advanceTimersByTime(2000))
    expect(input).toHaveValue('ㅍ')
    rerender(<Fields scopeKey={2} />)
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled()
  })

  it.each([{ enabled: false }, { active: false }, { initial: '기존 제목' }])('비활성 계정/화면과 기존 값은 보존한다 %j', (props) => {
    vi.useFakeTimers()
    render(<Fields {...props} />)
    fireEvent.click(screen.getByLabelText('제목'))
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByLabelText('제목')).toHaveValue(props.initial ?? '')
  })

  it('화면 닫기·질문 전환·언마운트에서 타이머를 해제한다', () => {
    vi.useFakeTimers()
    const view = render(<Fields />)
    fireEvent.click(screen.getByLabelText('제목'))
    view.rerender(<Fields active={false} />)
    expect(vi.getTimerCount()).toBe(0)
    view.rerender(<Fields scopeKey={2} />)
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '' } })
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('시연 계정 확인', () => {
  it('서버 이메일을 확인하고 계정 전환 시 이전 권한을 사용하지 않는다', async () => {
    vi.mocked(readStoredAuthSession).mockReturnValue({ userId: 7 } as never)
    vi.mocked(userApi.getMyProfile).mockResolvedValue({ userId: 7, email: 'kim.hakseup@devpath.com' } as never)
    const { result } = renderHook(() => useDemoAccount('kim.hakseup@devpath.com'))
    await waitFor(() => expect(result.current).toBe(true))
    vi.mocked(readStoredAuthSession).mockReturnValue({ userId: 8 } as never)
    vi.mocked(userApi.getMyProfile).mockResolvedValue({ userId: 8, email: 'other@devpath.com' } as never)
    act(() => window.dispatchEvent(new Event(AUTH_SESSION_SYNC_EVENT)))
    expect(result.current).toBe(false)
    await act(async () => {})
    expect(result.current).toBe(false)
  })
})
